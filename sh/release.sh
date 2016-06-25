#!/bin/sh

. `dirname $0`/common.sh

branch=$1
shift
root=$1
shift
args=($@)

for arg in ${args[@]}
do            
    cd $root${arg}
    git reset --hard
    git clean -df
    runCommand $arg "git fetch --all"
    runCommand $arg "git checkout ${branch}"
    runCommand $arg "git pull origin ${branch}"
    runCommand $arg "feather release -opmD -d build"
done