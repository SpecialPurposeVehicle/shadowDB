# Example start script
# Change the machine/apppath to target your own computer
machine=$(uname -n)
apppath='/srv/meteor/shadow.db-estate.co.uk/'
if [ $machine == 'dellboy' ]
then
    NODE_ENV="development" npm start
else
    forever start -c 'NODE_ENV="production" npm start' $apppath
fi
