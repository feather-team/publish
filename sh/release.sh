#!/bin/sh

branch=$1
shift
args=($@)

for arg in ${args[@]}
do            
    cd ${args}
    `feather release -opmD -d ../abc`
done