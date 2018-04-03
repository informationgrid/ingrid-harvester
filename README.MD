# Installation

If nodejs is not yet installed on the system than run:

> sudo yum install nodejs

or for ubuntu 

> sudo apt-get install nodejs



Run the following command to install all necessary dependencies:

> npm install


# Configuration

Edit the file config.js to define the location of the excel file to be imported ('filePath'). You can also
configure the address of the elasticsearch URL where the data shall be indexed to ('elasticSearchUrl').

# Run

Execute the following command to run a single import:

> npm start
