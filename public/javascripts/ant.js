$(function() {
    console.log( "ready!" );
    var cols = 4;
    var thisfocus = 1;
    var qry = '';
    var cache = {
        'tax':{},
        'repairs':{}
    }
    var mystate = {
        col:'#col1',
        estate_id: '',
        street_id: '',
        property_id: '',
        repairs_id: '',
        trade_id: '',
        arch:{}
    }
    var loadedesates = false;
    var stuff = 0;

    function query(url){
        stuff += 1;
        // Check if we should get content from the local cache
        if(url=== '/api/taxyear' && cache.tax[mystate.estate_id]!=undefined){
            console.log(stuff+': LOAD LOCAL CONTENT'+mystate.estate_id)
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
        if(url == '/api/taxyear'){
            console.log(stuff+': GEN HTML')
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
            //console.log(resp.workprog);
            html += '<h4>'+title+'Work programmes (Invoiced items)</h4>';
            html += '<table>';
            html += dateheader(resp.dates,'Progs')
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
                console.log('TRADES-----------');
                //console.log(resp.trades);
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
                for (var i = 0; i < resp.estates.length; i++) {
                    var estate = resp.estates[i].estate_name;
                    var id = resp.estates[i].estate_id;
                    html += '<option value='+id+'>'+estate+'</option>';
                }
                loadedesates = true;
            }else{
                return
            }
            setcol(html);
            setstate();
        }else if(url == '/api/streets'){
            for (var i = 0; i < resp.streets.length; i++) {
                var id = resp.streets[i].id;
                var name = resp.streets[i].name;
                html += '<option value='+id+'>'+name+'</option>';
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
            for (var i = 0; i < resp.properties.length; i++) {
                var num = resp.properties[i].AddressLine1;
                var Street = resp.properties[i].Street;
                var id = resp.properties[i].PropRef;
                html += '<option value="'+id+'">'+num+' '+Street+'</option>';
            }
            setcol(html);
            setstate();
        }else if(url == '/api/repairs'){
            for (var i = 0; i < resp.repairs.length; i++) {
                console.log(resp.repairs[i])
                var WORef = resp.repairs[i].WORef;
                cache.repairs[WORef] = resp.repairs[i];
                var DateRaised = resp.repairs[i].DateRaised;
                var DateInvoiced = resp.repairs[i].DateInvoice;
                if(DateInvoiced==''){
                    DateInvoiced = '[NoInvoice]'
                }
                var cost = resp.repairs[i].FinalCostInPence;
                var desc = resp.repairs[i].WODescription;
                var txt = DateRaised+' to '+DateInvoiced+' £'+cost;
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
        if(thisfocus==1){
            mystate.estate_id = mystate.value;
            mystate.estate_name = mystate.text;
            mystate.url  = '/api/estates';
            mystate.arch = {};
            mystate.WORef = '';
            mystate.street_id = '';
            if(w!='tax'){
                query('/api/taxyear');
            }
        }else if(thisfocus==2){
            mystate.street_id = mystate.value;
            mystate.street_name = mystate.text;
            mystate.arch = {};
            mystate.WORef = '';
            mystate.url = '/api/streets';
            $("select"+'#col'+(thisfocus-1)).val(mystate.estate_id);
        }else if(thisfocus==3){
            mystate.PropRef = mystate.value;
            mystate.address = mystate.text;
            mystate.WORef = '';
            mystate.url = '/api/properties';
            $("select"+'#col'+(thisfocus-1)).val(mystate.street_id);
        }else if(thisfocus==4){
            mystate.WORef = mystate.value;
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
        // Tax box
        $('#tax').html(cache.tax[mystate.estate_id]);
        // Update info box
        var msg = ''
        if(thisfocus==4){
            showbuild();
            msg = '<img src="'+mystate.arch.image+'" />';
            goframe();
        }
        $('#infobox').html(msg);
        // QRY BOX
        $('#qry').html(qry);
        // DEBUG BOX
        var msg = 'DEBUG<br />';
        msg += 'thisfocus:'+thisfocus+'<br/>';
        Object.keys(mystate).forEach(function(key) {
            msg += key+': '+mystate[key]+'<br />';
        });
        $('#debug').html(msg);
        // Video text box
        op =  mystate.estate_id+': '+mystate.estate_name+'<br />';
        if(t(mystate.street_id)){
            op += mystate.street_id+': '+mystate.street_name +'<br />';
        }
        if(t(mystate.arch.structure)){
            op += mystate.arch.structure+' Recorded as:'+mystate.arch.beds+' bed<br />';
        }
        if(t(mystate.arch.beds) && t(mystate.arch.size)){
            op += 'Size: '+mystate.arch.size+'<br />';
        }
        if(t(mystate.WORef)){
            op += 'WorkOrder: <br />'+mystate.WORef;
        }
        $('#vidmsg').html(op);
        //estate_id: '',
        //street_id: '',
        //property_id: '',
        //repairs_id: '',
        //trade_id: '',
    }

    function t(v){
        if(v==undefined || v=='' ){
            return false;
        }else{
            return true;
        }
    }

    function showbuild(){
        var blocks = [
            "/images/AE037-BlockTypeA.png",
            "/images/AE037-BlockTypeB.png",
            "/images/AE037-BlockTypeC.png",
            "/images/AE037-Bungalow.png"
        ];
        var block = blocks[Math.floor(Math.random()*blocks.length)];
        mystate.arch.structure = '2 bed (4p) House';
        mystate.arch.beds = '2';
        mystate.arch.size = '797 sq feet';
        mystate.arch.image = block;
    }

    // Load defaut content
    var video = '<video id="myvid" width="100%" controls loop autoplay>' //autoplay
    video += '<source src="/video/UpgroveManorWay1920x1080.MP4" type="video/mp4">';
    //video += '<source src="mov_bbb.ogg" type="video/ogg">';
    video += 'Your browser does not support HTML5 video.';
    video += '</video>';
    $("#video").html(video);

    // Video control
    var video = $('video').get(0);
    var framerate = 25;
    function getFrame() {
        curTime = video.currentTime;
        frame=Math.floor(curTime*framerate);
        $('#vidframe').text('Frame: '+frame);
    }

    video.onplay = function () {
        theInterval = setInterval(function() {
            getFrame();
        }, (1000 / framerate));
    };

    function goframe(){
        frames = [1608, 2204, 2954, 7104, 8086];
        var myframe = frames[Math.floor(Math.random()*frames.length)];
        video.currentTime=myframe/framerate;
    }

    // Load default values
    video.pause();
    query('/api/estates');
    query('/api/totalrepairs');
});
