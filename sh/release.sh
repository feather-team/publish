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
    execCommand $arg "git fetch --all"
    execCommand $arg "git checkout ${branch}"
    execCommand $arg "git pull origin ${branch}"
    execCommand $arg "feather release -opmD -d build"
done