#!/bin/sh

. `dirname $0`/common.sh

root=$1
shift
args=($@)
formatArgs="%an %aE %ai %s %h"

for arg in ${args[@]}
do            
    cd $root${arg}
    git log --pretty=format:'[%h %an %s]' -n 1 2>&1
done
