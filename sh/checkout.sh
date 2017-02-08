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
    echo -e "进入[${arg}]目录\n"
    git reset --hard
    git clean -df

    localBranchCount=`git branch -l 2>&1 | grep ${branch}$ | wc -l`
    version=""

    if [[ $localBranchCount -ne 0 ]]
    then
        execCommand $arg "git checkout ${branch}"
        version=`git log -n 1 --pretty=format:"%h" 2>&1`

        if [[ $branch != "master" ]]
        then
            echo -e "当前操作分支非master分支，进行删除本地分支操作，读取远程分支\n"
            execCommand $arg "git checkout master"
            execCommand $arg "git branch -D ${branch}"
        fi
    fi

    execCommand $arg "git fetch origin ${branch}" "1"
    execCommand $arg "git checkout ${branch}"
    execCommand $arg "git pull origin ${branch}" "1"
    execCommand $arg "git submodule init"
    execCommand $arg "git submodule update"

    if [[ $version != "" ]]
    then
        diff=`git diff ${version} ${branch} 2>&1 | grep 'diff --git'`
        echo -e "git diff:\n${diff}\n"
    fi

    msg=`git log --pretty=format:'[%h %an %ae %s]' -n 1`
    echo -e "git log: ${msg}"
done