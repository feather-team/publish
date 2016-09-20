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
    factory=`echo $arg | cut -d \: -f 1`
    type=`echo $arg | cut -d \: -f 2`
    deploy=`echo $arg | cut -d \: -f 3`

    cd $root${factory}
    echo "当前操作[${factory}]仓库"
    git reset --hard
    git clean -df
    execCommand $arg "git checkout ${branch}"
    execCommand $arg "git pull origin ${branch}"
    execCommand $arg "git submodule init"
    execCommand $arg "git submodule update"
    
    if [[ $type != "feather" ]]
    then
        echo "$type release pd -d $deploy"
        execCommand $arg "$type release pd -d $deploy"
    else
        execCommand $arg "feather release -opmD -d $deploy"
    fi
done
