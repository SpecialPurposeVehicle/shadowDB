# Example start script
# Change the machine/apppath to target your own computer
machine=$(uname -n)
if [ $machine == 'dellboy' ]
then
    NODE_ENV="development" npm start
else
    apppath='/srv/meteor/shadow.db-estate.co.uk/'
    forever start -c 'NODE_ENV="production" npm start' $apppath
fi
echo $NODE_ENV
