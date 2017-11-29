#!/bin/sh

. `dirname $0`/common.sh

branch=$1
shift
root=$1
shift
args=($@)

for arg in ${args[@]}
do            
	repo=`echo $arg | cut -d ':' -f 1`
	revert=`echo $arg | cut -d ':' -f 2`

    cd ${root}${repo}
    echo -e "进入[${repo}]目录\n"

    execCommand $repo "git checkout ${branch}"

    if [[ $revert != "" ]]
    then
    	echo -e "恢复${branch}分支至${revert}\n"
    	execCommand $repo "git reset --hard ${revert}"
    	execCommand $repo "git checkout master"
    else
    	execCommand $repo "git checkout master"

    	if [[ $branch != "master" ]]
    	then
    		echo -e "删除${branch}分支\n"
    		execCommand $repo "git branch -D ${branch}"
    	fi
   	fi
done