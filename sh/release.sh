#!/bin/sh

. `dirname $0`/common.sh

branch=$1
shift
commitMsg=$1
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

echo -e "产出目录切换分支$branch\n"

for dist in ${dists[@]}
do            
    cd $root${dist}
    echo -e "进入[${dist}]目录\n"
    git reset --hard
    git clean -df

    # fetchRes=`git fetch origin ${branch} 2>&1`
    # noBranch=`echo $fetchRes|grep "Couldn't find remote ref ${branch} fatal:"`

    execCommand $dist "git fetch --all -p" "1"
    branchCount=`git branch -r 2>&1 | grep ${branch}$ | wc -l`

    if [[ $branchCount -ne 0 ]]
    then
        execCommand $dist "git checkout ${branch}"
        execCommand $dist "git pull origin ${branch}" "1"
    else
        echo "远程${branch}分支不存在，尝试删除本地分支并切换新分支"
        execCommand $dist "git checkout master"
        execCommand $dist "git pull origin master" "1"

        localBranchCount=`git branch -l 2>&1 | grep ${branch}$ | wc -l`

        if [[ $localBranchCount -ne 0 ]]
        then
            execCommand $dist "git branch -D ${branch}"
        fi
        
        execCommand $dist "git checkout -b ${branch}"
    fi
done

echo -e "\n编译依赖模块\n"

for dep in ${deps[@]}
do
    dir=`echo $dep | cut -d '~' -f 1`
    cmd=`echo $dep | cut -d '~' -f 2`

    cd $root${dir}
    echo -e "进入[${dir}]目录\n"
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
    echo "${cmd} release ${arg}"
    ${cmd} release ${arg}
done

echo -e "\n正式编译开始\n"

for release in ${releases[@]}
do
    dir=`echo $release | cut -d '~' -f 1`
    cmd=`echo $release | cut -d '~' -f 2`
    dest=`echo $release | cut -d '~' -f 3`

    cd $root${dir}
    echo -e "进入[${dir}]目录\n"

    if [[ $cmd == "feather" ]]
    then
        arg='-opmD'
    else
        arg='pd'
    fi

    echo "${cmd} release ${arg} -d ${dest}"
    $cmd release ${arg} -d $dest
done

for release in ${releases[@]}
do
    dir=`echo $release | cut -d '~' -f 1`
    
    if [ -d "$root${dir}" ]
    then
        cd $root${dir}
        echo -e "恢复[${dir}]目录master分支\n"
        execCommand $dir "git checkout master"
    fi
done

echo -e "\n编译完成，提交代码\n"

for dist in ${dists[@]}
do            
    cd $root${dist}
    echo -e "进入[${dist}]目录\n"
    execCommand $dist "git add -A"
    git commit -m "前端编译平台自动提交记录: ${commitMsg}" 2>&1
    branchCount=`git branch -r 2>&1 | grep ${branch}$ | wc -l`

    if [[ $branchCount -ne 0 ]]
    then
        execCommand $dist "git pull origin ${branch}" "1"
    fi 

    execCommand $dist "git push origin ${branch}" "1"
    execCommand $dist "git checkout master"
done
