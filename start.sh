# Start script for shadow DB. Note:
# Change the machine name 'dellboy' to your own 'local' computer
machine=$(uname -n)

# Either start locally or use 'forever' on a production server
# NOTE: Works with node 9.8.0
if [ $machine == 'dellboy' ]
then
    NODE_ENV="development" npm start
    exit
else
    export PORT="4949"
    export NODE_ENV="production"
    SCRIPTPATH="$( cd "$(dirname "$0")" ; pwd -P )"
    forever start $SCRIPTPATH/bin/www
fi
