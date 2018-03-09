$(function() {
    var cols = 4;
    var thisfocus = 1;
    var qry = '';
    var cache = { // Local cache
        'estates':{data:{}},
        'streets':{data:{}},
        'properties':{data:{}},
        'repairs':{data:{}},
        'tax':{},
        'mykeys':{}
    }
    var mystate = {
        col:'#col1',
        server:'',
        estate_id: 'EA037',
        street_id: '',
        property_id: '',
        repairs_id: '',
        trade_id: '',
        arch:{}
    }
    var loadedesates = false;
    var stuff = 0;
    var video = null;
    var framerate = 25;

    function query(url){
        stuff += 1;
        // Check if we should get content from the local cache
        if(url=== '/api/taxyear' && cache.tax[mystate.estate_id]!=undefined){
            logme(stuff+': LOAD LOCAL CONTENT'+mystate.estate_id)
            setstate('tax');
            return
        }
        // Grab content from the server
        $.ajax({
            type: 'POST',
            url: url,
            data: mystate,
            dataType: 'json',
            success: function (successResponse) {
                setcontent(url, successResponse);
            },
            error: function (errorResponse) { }
        });
    }

    function dateheader(dates, title){
        //var dates = ['2011-12','2012-13','2013-14','2014-15','2015-16','2016-17']
        // Date row
        var html = '<tr>'
        if(title != ''){
            html += '<th></th>';
        }
        for (var l in dates) {
            html += '<th colspan="2">'+dates[l]+'</th>';
        }
        // Descriptor row
        html += '<tr class="hrow2">'
        if(title != ''){
            html += '<th>'+title+'</th>';
        }
        for (var l in dates) {
            html += '<th>cost</th>';
            html += '<th>Jobs</th>';
        }
        html += '</tr>'

        return html
    }

    function setcontent(url, resp){
        qry = resp.qry;
        html = '';
        if(mystate.server===''){
            mystate.server=resp.server;
        }else{
            if (mystate.server === 'production'){
                cols=1;
                $('#col2').remove();
                $('#col3').remove();
                $('#col4').remove();
            }
        }
        if(url == '/api/taxyear'){
            logme(stuff+': GEN HTML')
            // Create the title
            var t = resp.estate_name;
            if(resp.estate_id=='ALL'){
                t = "ALL LAMBETH's PROPERTIES"
            }
            title = t+': 1st April to 31st March | ';
            // INVOICES
            html += '<h4>'+title+'Total repairs (Invoiced items)</h4>';
            html += '<table>'
            html += dateheader(resp.dates, '')
            for (var k in resp.taxyear) {
                a = ''+resp.taxyear[k]['value'];
                anum = a.substr(0, a.length-2); // remove the pence
                num = numberWithCommas(anum);
                html += '<td colspan="2">£'+num+'</td>';
            }
            html += '</tr>'
            html += '</table>'
            // WORK PROGRAMMES
            //logme(resp.workprog);
            html += '<h4>'+title+'Work programmes (Invoiced items)</h4>';
            html += '<table>';
            html += dateheader(resp.dates,'Progs')
            cache.mykeys = resp.mykeys;
            for (var k in resp.workprog) {
                var name = resp.mykeys[k];
                html += '<tr>';
                html += '<td>';
                html += '<span class="name">'+name+'</span>';
                html += '<span class="code">'+k+'</span>';
                html += '</td>';
                for (var l in resp.workprog[k]) {
                    if(resp.workprog[k][l].cost===undefined){
                        cost = '0';
                    }else{
                        cost = resp.workprog[k][l].cost;
                    }
                    cost = ''+cost;
                    if(resp.workprog[k][l].jobs===undefined){
                        jobs = '';
                    }else{
                        jobs = resp.workprog[k][l].jobs
                    }
                    // Insert a decimal point
                    cost = adddecimalpoint(cost)
                    cost = numberWithCommas(cost);
                    html += '<td>'+cost+'</td>';
                    html += '<td class="jobs">'+jobs+'</td>';
                }
                html += '</tr>';
            }
            html += '</table>';
            // TRADES
            if(resp.showtrades){
                logme('TRADES-----------');
                //logme(resp.trades);
                html += '<h4>'+title+'Trades (Invoiced items)</h4>';
                html += '<table>';
                html += dateheader(resp.dates,'Trades')
                for (var k in resp.trades) {
                    var name = resp.mykeys[k];
                    html += '<tr>';
                    html += '<td>';
                    html += '<span class="name">'+name+'</span>';
                    html += '<span class="code">'+k+'</span>'
                    html += '</td>';
                    for (var l in resp.trades[k]) {
                        if(resp.trades[k][l].cost===undefined){
                            cost = '0';
                        }else{
                            cost = resp.trades[k][l].cost;
                        }
                        if(resp.trades[k][l].jobs===undefined){
                            jobs = '';
                        }else{
                            jobs = resp.trades[k][l].jobs
                        }
                        // Insert a decimal point
                        cost = adddecimalpoint(cost)
                        cost = numberWithCommas(cost);
                        html += '<td>'+ cost+'</td>';
                        html += '<td class="jobs">'+jobs+'</td>';
                    }
                    html += '</tr>';
                }
                html += '</table>';
            }
            cache.tax[resp.estate_id] = html;

            setstate('tax');
        }else if(url == '/api/estates'){
            if(!loadedesates){
                Object.keys(resp.estates).forEach(function(id) {
                    var estate = resp.estates[id].estate_name;
                    var p = numberWithCommas(resp.estates[id].properties)
                    var props = ': '+p;
                    if(id=='ALL'){props += ' properties';}
                    if(id=='#'){props = '';}
                    html += '<option value='+id+'>'+estate+props+'</option>';
                });
                cache.estates.data = resp.estates;
                loadedesates = true;
            }else{
                return
            }
            $(mystate.col).html(html);
            $("select"+mystate.col).val("EA037");
            $(mystate.col).focus();
            setstate();
        }else if(url == '/api/streets'){
            for (var i = 0; i < resp.streets.length; i++) {
                var id = resp.streets[i].id;
                var p = numberWithCommas(resp.streets[i].properties)
                var props = ': '+p;
                if(id=='#'){props=''}
                var name = resp.streets[i].name;
                html += '<option value="'+id+'">'+name+props+'</option>';
                cache.streets.data[id] = resp.streets[i];
            }
            setcol(html);
            setstate();
        }else if(url == '/api/trades'){
            for (var i = 0; i < resp.trades.length; i++) {
                var id = resp.trades[i].trade_id;
                var name = resp.trades[i].name;
                html += '<option value="'+id+'">'+id+':'+name+'</option>';
            }
            setcol(html);
            setstate();
        }else if(url == '/api/properties'){
            var a = b = '';
            Object.keys(resp.properties).forEach(function(id) {
                var num = resp.properties[id].address1;
                var street = resp.properties[id].street;
                var c = '<option value="'+id+'">'+num+' '+street+'</option>';
                if(id=='ALL'){
                    a = c
                }else if(id=='#'){
                    b = c
                }else{
                    html += c;
                }
            });
            html = a+b+html;
            cache.properties.data = resp.properties;
            setcol(html);
            setstate();
        }else if(url == '/api/repairs'){
            for (var i = 0; i < resp.repairs.length; i++) {
                var id = resp.repairs[i].repairs_id;
                cache.repairs.data[id] = resp.repairs[i];
                var DateRaised = resp.repairs[i].DateRaised;
                var cost = adddecimalpoint(resp.repairs[i].FinalCostInPence)
                cost = numberWithCommas(cost);
                var txt = DateRaised+' £'+cost;
                html += '<option value="'+id+'">'+txt+'</option>'
            }
            setcol(html);
            setstate();
        }
    }

    function adddecimalpoint(astring){
        astring = astring+'' // make sure we are dealing with a string
        if(astring == '0'){
            return '';
        }
        beg = astring.substr(0, astring.length-2);
        end = astring.substr(astring.length-2, astring.length);
        return beg+'.'+end;
    }
    function setcol(html){
        $(mystate.col).html(html);
        $("select"+mystate.col).val("ALL");
        $(mystate.col).focus();
    }

    /* ON MOUSE EVENT
    $('.setview').mousedown(function(e) {
        var id = e.delegateTarget.id;
        var val = e.target.value;
        thisfocus = parseInt(id.replace("col", ""));
        if(id=='col1') {
            mystate.estate_id = val;
        }else if(id=='col2') {
            mystate.street_id = e.target.value;
        }else if(id=='col3') {
            mystate.trade_id = e.target.value;
        }else if(id=='col4') {
            mystate.property_id = e.target.value;
            mystate.PropRef = e.target.value;
        }else if(id=='col5') {
            mystate.repairs_id = e.target.value;
        }
        dosearch();
    });*/
    function numberWithCommas(x) {
        if(x===undefined){
            return '0';
        }
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    // DETECT WHEN SELECT VALUE HAS CHANGED
    $('.showstate').change(function(){
        setstate();
    });

    // ON KEYDOWN EVENT
    $(document).keydown(function(e) {
        if(e.which == 37) { // left arrow
            thisfocus -= 1;
            if(thisfocus < 1){
                thisfocus = 1;
            }
            setstate();
        }else if(e.which == 39) { // right arrow
            thisfocus += 1;
            if(thisfocus > cols){
                thisfocus = cols;
            }
            setstate();
            query(mystate.url);
        }else if(e.which==32){ // space
            if(video.paused){
                video.play();
            }else{
                video.pause();
            }
        }
    });

    function setstate(w){
        mystate.col = "#col"+thisfocus;
        mystate.value = $(mystate.col).find(":selected").val();
        mystate.text = $(mystate.col).find(":selected").text();
        if(thisfocus==1){      // ESTATES
            mystate.estate_id = mystate.value;
            mystate.estate_name = mystate.text;
            mystate.url  = '/api/estates';
            mystate.property_id = '';
            mystate.repairs_id = '';
            mystate.street_id = '';
            if(w!='tax'){
                query('/api/taxyear');
            }
        }else if(thisfocus==2){ // STREETS
            mystate.street_id = mystate.value;
            mystate.street_name = mystate.text;
            mystate.property_id = '';
            mystate.repairs_id = '';
            mystate.url = '/api/streets';
            $("select"+'#col'+(thisfocus-1)).val(mystate.estate_id);
        }else if(thisfocus==3){ // PROPERTIES
            mystate.property_id = mystate.value;
            mystate.address = mystate.text;
            mystate.repairs_id = '';
            mystate.url = '/api/properties';
            $("select"+'#col'+(thisfocus-1)).val(mystate.street_id);
        }else if(thisfocus==4){ // REPAIRS
            mystate.repairs_id = mystate.value;
            mystate.url = '/api/repairs';
            $("select"+'#col'+(thisfocus-1)).val(mystate.property_id);
        }
        setview();
    }

    function setview(){
        // Select focus and css of selected element
        $(mystate.col).focus();
        // Set the borders
        for(i=1; i<cols+1; i++){
            // Reset the grey borders
            $('#col'+i).css({"border-top":"5px solid #ccc"});
            if(i==thisfocus){
                $('#col'+i).css({"border-top":"5px solid rgb(255, 0, 102)", "width":"auto"});
            }
            // Clear the html of dead cols
            if(i>thisfocus){
                $( "#col"+i).html('');
            }
        }
        // QRY BOX
        $('#qry').html(qry);
        // DEBUG BOX
        var msg = 'thisfocus:'+thisfocus+'<br/>';
        Object.keys(mystate).forEach(function(key) {
            msg += key+': '+mystate[key]+'<br />';
        });
        $('#debug').html(msg);
        // ESTATE TEXT
        var estate = cache.estates.data[mystate.estate_id];
        msg = estate.estate_name+'<br />';
        msg += '<div class="sub">('+estate.properties+' homes managed by Lambeth)</div>';
        if(thisfocus=='1'){
            $('#tax').html(cache.tax[mystate.estate_id]);
        }
        // STREET TEXT
        if(t(mystate.street_id)){
            var street = cache.streets.data[mystate.street_id];
            msg += street.name +'<br />';
            msg += '<div class="sub">('+street.properties +' homes)</div>';
            $('#tax').html('');
        }
        // HOME INFORMATION
        if(mystate.property_id=='ALL' || mystate.property_id=='#' ){
            $('#tax').html('');
        }
        if(t(mystate.property_id)){
            var property = cache.properties.data[mystate.property_id];
            var num = property.address1;
            var aft = struct = '';
            //logme(property);
            // Build the property text/video/image display
            if(num===null || num=="" || property.street==""){
                num = property.tmp_structure_add.replace(street.name, "");
                aft = '<div class="sub">(exact address unknown)</div>';
            }else{
                if(property.bedrooms <=1){
                    btxt = 'bed'
                }else{
                    btxt = 'beds'
                }
                struct = '<div class="sub">(';
                struct += property.bedrooms+' '+btxt+' | ';
                struct += property.size_sq_meter+' Sqm )';
                struct += '</div>'
                // show the  video frame
                goframe(property.video_frame, property.file_name);
            }
            msg += num+' '+property.street+'<br />'+aft+struct;
            var img = '';
            if(t(property.image_plan)){
                img = '<img src="images/'+property.image_plan+'" />';
            }
            //$('#tax').html(img); // display on right
            msg += img;            // display on left
        }
        // WORK ORDERS
        if(t(mystate.repairs_id)){
            var repair = cache.repairs.data[mystate.repairs_id];
            // WORef, WorkProg, MainTrade, FinalCostInPence,
            // WODescription, DateRaised, DateInvoice: ""
            rmsg = '<div id="repair">'; //class="fadeback"
            rmsg += '<h4>ID:'+repair.WORef;
            cost = adddecimalpoint(repair.FinalCostInPence)
            cost = numberWithCommas(cost);
            rmsg += ' Cost: £'+cost+' </h4>';
            rmsg += ' Trade:'+repair.MainTrade;
            logme(cache.mykeys)
            rmsg += '<span id="status"><b>Status:</b>'+cache.mykeys[repair.WOStatus]+''+repair.WOStatus+'</span>';
            rmsg += '<hr />';
            rmsg += ' Raised:'+repair.DateRaised;
            rmsg += ' Invoiced:'+repair.DateInvoice;
            rmsg += '<hr />';
            rmsg += repair.WODescription;
            rmsg += '</div>';
            $('#tax').html(rmsg);
        }
        // OVERLAY VIDEO TXT
        $('#vidmsg').html(msg);
    }

    function t(v){
        if(v==undefined || v=='' ){
            return false;
        }else{
            return true;
        }
    }

    function createvideo(myfile){
        if (mystate.server==='production' || mystate.server===''){
            $("#video").html('<img src="/images/background.png">');
            console.lo
            return
        }
        var filepath ="/media/video/CGE.spv/"+myfile;
        if(myfile==null){
            logme('videofile=null');
            return
        }else if(myfile==vidfile){
            logme('video already running: '+myfile);
            return
        }
        logme('Load a new file:'+myfile);
        // Generate the HTML
        if(video==''){
            var videohtml = '<video id="myvid" width="100%" controls loop autoplay>' //autoplay
            videohtml += '<source src="'+filepath+'" type="video/mp4">';
            //video += '<source src="mov_bbb.ogg" type="video/ogg">';
            videohtml += 'Your browser does not support HTML5 video.';
            videohtml += '</video>';
            $("#video").html(videohtml);
            // Video control
            video = $('video').get(0);
            video.onplay = function () {
                theInterval = setInterval(function() {
                    getFrame();
                }, (1000 / framerate));
            };
            video.pause();
        }else{
            video.pause();
            $('#myvid').attr('src', filepath);
            video.load();
            /*$('#myvid').addEventListener('loadedmetadata', function() {
                var settime = newframe/framerate;
                this.currentTime = newframe/framerate;
                logme('loaded:'+settime)
            }, false);*/
            //video.play();
        }
        // Set the global video file ref
        vidfile = myfile;
    }

    function getFrame() {
        curTime = video.currentTime;
        frame=Math.floor(curTime*framerate);
        $('#vidframe').text('Frame: '+frame);
    }

    var frametimer = 500;
    var newframe = '1';
    var myvidtimer = setTimeout( function(){}, 1);
    var gmyfile = '';

    function goframe(myframe, myfile){
        gmyfile = myfile;
        clearTimeout(myvidtimer);
        newframe = Number(myframe);
        myvidtimer = setTimeout(setframe, frametimer)
    }

    function setframe(){
        if(newframe != ''){
            createvideo(gmyfile)
            if(video.paused){
                video.play();
            }
            video.currentTime=newframe/framerate;
        }
    }

    function goframerandom(){
        var myframe = Math.floor(Math.random()*8086);
        goframe(myframe)
    }

    function logme(msg){
        if (mystate.server === 'development'){
            console.log(msg);
        }
    }

    // Load default values
    var vidfile = '', video = '';
    createvideo('CROSBY-TOP.21-39.BACKofSMW.23sept17.HiRes.MP4');
    query('/api/estates');
    //query('/api/totalrepairs');
});
