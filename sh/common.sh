#!/bin/sh

b(){
    echo 123
}

function execCommand(){
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