#!/bin/sh

. `dirname $0`/common.sh

branch=$1
shift
root=$1
shift
args=($@)

for arg in ${args[@]}
do            
    cd ${root}${arg}
    echo "${root}${arg}"
    echo 123
    echo "当前操作[${arg}]仓库"
    git reset --hard
    git clean -df
    execCommand $arg "git fetch origin ${branch} -p"
    echo 123
    branchCount=`git branch -r 2>&1 | grep ${branch}$ | wc -l`

    if [[ $branchCount -ne 0 ]]
    then
        execCommand $arg "git checkout ${branch}"
        execCommand $arg "git pull origin ${branch}"
        execCommand $arg "git submodule init"
        execCommand $arg "git submodule update"
    else
        execCommand $arg "git checkout master"
        execCommand $arg "git pull origin master"

        localBranchCount=`git branch -l 2>&1 | grep ${branch}$ | wc -l`

        if [[ $localBranchCount -ne 0 ]]
        then
            execCommand $arg "git branch -D ${branch}"
        fi
        
        execCommand $arg "git checkout -b ${branch}"
    fi
done