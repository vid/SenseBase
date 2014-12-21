#!/bin/bash

# escape passed filename for " and space
e=`echo $1 | sed 's/ /\ /g'| sed 's/"/\\"/g'`
cat "$e" | java -jar ext-lib/tika-app-1.5.jar  -

