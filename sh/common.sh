#!/bin/sh

function execCommand(){
    isGit=`echo $2 | grep '^git '`
    result=`$2 2>&1`
    code=$?

    echo "${2}"

    if [[ $isGit != "" ]]
    then
        hasError=`echo $result | grep -E '(fatal:|error:)'`
        hasConflict=`echo $result | grep -E '(CONFLICT|Automatic merge failed)'`

        if [[ $hasError != "" ]]
        then
            echo "${result}"
            echo "" >&2
            exit $code
        elif [[ $hasConflict != "" ]]
        then
            echo "${result}"
            echo ""
            execCommand $1 "git checkout --theirs ./"
            execCommand $1 "git add -A"
            execCommand $1 "git commit -m '尝试解决冲突'"
        else
            echo "${result}"
            echo ""
        fi
    else
        if [[ $code -ne 0 ]]
        then
            echo "${result}" 
            echo "" >&2
            exit $code
        else
            echo "${result}"
            echo ""
        fi
    fi
}