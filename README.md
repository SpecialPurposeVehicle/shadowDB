## Lambeth Shadow Database

This nodejs application displays housing data for all of 
the London Borough of Lambeth. The data was obtained via FOI requests
and enacting a legislative right to audit Lambeths Accounts.

This application has only been tested in a linux laptop and online 
server which both run the Arch Linux OS. To run the application first 
download from github then navigate to the application directory and 
run start.sh: 
    
    $ git clone https://github.com/SpecialPurposeVehicle/shadowDB.git
    $ cd shadowDB
    $ chmod u+x start.sh
    $ ./start.sh

You should then be able to open a browser and view the interface at
http://localhost:3000

## The Tech
This application used node, express, and sqlite. 
Its base structure was created using node express generator:
https://expressjs.com/en/starter/generator.html


## License

Copyright (C) 2018 Tom Keene as part of PhD research documented at www.db-estate.co.uk              

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see http://www.gnu.org/licenses/.   
