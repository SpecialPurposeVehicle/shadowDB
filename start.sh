# Start script for shadow DB. Note:
# Change the machine anme to target your own 'local' computer
machine=$(uname -n)

# Either start locally or use 'forever' on a production server
if [ $machine == 'dellboy' ]
then
    NODE_ENV="development" npm start
else
    export NODE_ENV="production"
    SCRIPTPATH="$( cd "$(dirname "$0")" ; pwd -P )"
    forever start $SCRIPTPATH/bin/www
fi
