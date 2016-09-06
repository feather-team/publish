#!/bin/sh

. `dirname $0`/common.sh

branch=$1
shift
root=$1
shift
commitMsg=$1
shift
args=($@)

for arg in ${args[@]}
do            
    cd $root${arg}
    echo "当前操作[${arg}]仓库"
    execCommand $arg "git add -A"
    git commit -m "feather-publish平台自动提交记录：${commitMsg}"

    branchCount=`git branch -r 2>&1 | grep ${branch}$ | wc -l`

    if [[ $branchCount -ne 0 ]]
    then
        execCommand $arg "git pull origin ${branch}"
    fi 

    execCommand $arg "git push origin ${branch}"
    execCommand $arg "git checkout master"
done