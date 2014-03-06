#!/bin/bash

# escape passed filename for " and /
e=`echo $1 | sed 's/"/\\"/g'`
cat "$e" | java -jar ext-lib/tika-app-1.4.jar

