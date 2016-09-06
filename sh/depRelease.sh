#!/bin/sh

. `dirname $0`/common.sh

branch=$1
shift
root=$1
shift
args=($@)

echo $args
echo $root

for arg in ${args[@]}
do            
    cd $root${arg}
    echo "当前操作[${arg}]仓库"
    git reset --hard
    git clean -df
    execCommand $arg "git checkout ${branch}"
    execCommand $arg "git pull origin ${branch}"
    execCommand $arg "git submodule init"
    execCommand $arg "git submodule update"
    execCommand $arg "feather release -opmD"
done
