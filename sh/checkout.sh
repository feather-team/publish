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
    execCommand $arg "git fetch origin ${branch}" "1"
    execCommand $arg "git checkout ${branch}"
    execCommand $arg "git pull origin ${branch}" "1"
    execCommand $arg "git submodule init"
    execCommand $arg "git submodule update"

    msg=`git log --pretty=format:'[%h %an %ae %s]' -n 1`
    echo "git log: ${msg}"
done