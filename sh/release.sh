#!/bin/sh

. `dirname $0`/common.sh

branch=$1
shift
root=$1
shift
deps=`echo $1 | cut -d ':' -f 2`
deps=${deps//,/ }
shift
releases=`echo $1 | cut -d ':' -f 2`
releases=${releases//,/ }
shift
dists=`echo $1 | cut -d ':' -f 2`
dists=${dists//,/ }
#shift
#args=($@)

./checkout.sh $branch $root $dists

for dep in ${deps[@]}
do
    dir=`echo $dep | cut -d '~' -f 1`
    cmd=`echo $dep | cut -d '~' -f 2`

    cd $root${dir}
    git reset --hard
    git clean -df
    execCommand $arg "git checkout master"
    execCommand $arg "git submodule init"
    execCommand $arg "git submodule update"

    if [[ $cmd == "feather" ]]
    then
        arg='-opmD'
    else
        arg='pd'
    fi

    cmd="${cmd} release ${arg}"
    execCommand $dir "$cmd"
done

for release in ${releases[@]}
do
    dir=`echo $release | cut -d '~' -f 1`
    cmd=`echo $release | cut -d '~' -f 2`
    dest=`echo $release | cut -d '~' -f 3`

    cd $root${dir}

    if [[ $cmd == "feather" ]]
    then
        arg='-opmD'
    else
        arg='pd'
    fi

    cmd="${cmd} release ${arg} -d ${dest}"
    execCommand $dir "$cmd"
done

for dist in ${dists[@]}
do            
    cd $root${dist}

    execCommand $dist "git add -A"
    git commit -m "前端编译平台自动提交记录" 2>&1
    branchCount=`git branch -r 2>&1 | grep ${branch}$ | wc -l`

    if [[ $branchCount -ne 0 ]]
    then
        execCommand $arg "git pull origin ${branch}"
    fi 

    execCommand $arg "git push origin ${branch}"
    execCommand $arg "git checkout master"
done