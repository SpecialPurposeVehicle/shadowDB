# Start script for shadow DB. Note:
# Change the machine anme to target your own 'local' computer
machine=$(uname -n)
<<<<<<< HEAD
=======

# Either start locally or use 'forever' on a production server
>>>>>>> ec3a72608b362cc247010df47dc598b8309d13be
if [ $machine == 'dellboy' ]
then
    NODE_ENV="development" npm start
else
<<<<<<< HEAD
    apppath='/srv/meteor/shadow.db-estate.co.uk/'
    forever start -c 'NODE_ENV="production" npm start' $apppath
=======
    export NODE_ENV="production"
    SCRIPTPATH="$( cd "$(dirname "$0")" ; pwd -P )"
    forever start $SCRIPTPATH/bin/www
>>>>>>> ec3a72608b362cc247010df47dc598b8309d13be
fi
