#!/bin/sh

function runCommand(){
    isGit=`echo $2 | grep '^git '`

    if [[ $isGit != "" ]]
    then
        result=`$2 2>&1`
        hasError=`echo $result | grep -E '(fatal:|error:|CONFLICT|Automatic merge failed)'`

        if [[ $hasError != "" ]]
            then 
                echo "仓库[$1] ${result}"  >&2
                exit $?
            else
                echo -e "${result}\n"
        fi
    else
        result=`$2`

        if [[ $? -ne 0 ]]
            then
                echo "仓库[$1] ${result}"  >&2
                exit $?
            else
                echo -e "${result}\n"
        fi
    fi
}

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
    runCommand $arg "git fetch --all"
    runCommand $arg "git checkout ${branch}"
    runCommand $arg "git pull origin ${branch}"
    runCommand $arg "feather release -opmD -d build"
done