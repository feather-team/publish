#!/bin/sh

function execCommand(){
    isGit=`echo $2 | grep '^git '`
    result=`$2 2>&1`
    code=$?

    if [[ $isGit != "" ]]
    then
        hasError=`echo $result | grep -E '(fatal:|error:)'`
        hasConflict=`echo $result | grep -E '(CONFLICT|Automatic merge failed)'`

        if [[ $hasError != "" ]]
        then
            echo "仓库[$1] ${result}" >&2
            exit $code
        elif [[ $hasConflict != "" ]]
        then
            echo "仓库[$1]操作时，发生冲突：${result}"
            execCommand $1 "git checkout --theirs ./"
            execCommand $1 "git add -A"
            execCommand $1 "git commit -m '尝试解决冲突'"
        else
            echo -e "${result}\n"
        fi
    else
        if [[ $code -ne 0 ]]
        then
            echo "仓库[$1] ${result}" >&2
            exit $code
        else
            echo -e "${result}\n"
        fi
    fi
}