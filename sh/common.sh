#!/bin/sh

function execCommand(){
    isGit=`echo $2 | grep '^git '`
    errorRetry=$3
    result=`$2 2>&1`
    code=$?

    echo "${2}"

    if [[ $isGit != "" ]]
    then
        hasError=`echo $result | grep -iE '(fatal:|error:)'`
        hasConflict=`echo $result | grep -iE '(CONFLICT|Automatic merge failed)'`

        if [[ $hasError != "" ]]
        then
            if [[ $errorRetry != "" ]]
            then
                echo "${result}"
                echo "git操作出现错误，尝试重新执行"
                execCommand $1 "$2"
            else
                echo "${result}" >&2
                exit $code
            fi
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
            echo "${result}" >&2
            exit $code
        else
            echo "${result}"
            echo ""
        fi
    fi
}