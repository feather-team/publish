#!/bin/sh

function runCommand(){
    isGit=`echo $1 | grep '^git '`

    if [[ $isGit != "" ]]
    then
        result=`$1 2>&1 | grep -E '^(error|fatal)'`

        if [[ $result != "" ]]
            then 
                echo "error"
                echo ${result} >&2
                exit $?
        fi
    else
        result=`$1`

        if [[ $? -ne 0 ]]
            then
                echo ${result} >&2
                exit $?
        fi
    fi
}

branch=$1
shift
args=($@)

for arg in ${args[@]}
do            
    cd ${arg}
    git reset --hard
    git clean -df
    runCommand "git fetch --all"
    runCommand "git checkout ${branch}"
    runCommand "git pull origin ${branch}"
    runCommand "feather release -opmD -d local"
done