#!/bin/bash

# if [ -z "$1" ] ; then
#   echo 'sogou_link missing.'
#   exit 1
# fi
# SOGOU_LINK=$1




if [[ "$OSTYPE" =~ ^darwin ]]; then
  MD5_CMD=md5
fi
if [[ "$OSTYPE" =~ ^linux ]]; then
  MD5_CMD=md5sum
fi
RANDOM_STR=`echo $RANDOM | $MD5_CMD | head -c 20`

WX_ID=$1
ARTICLE_INDEX=$2
SOGOU_WX_URL='https://weixin.sogou.com/weixin?type=1&s_from=input&query='$WX_ID
echo $SOGOU_WX_URL
wget $SOGOU_WX_URL
# curl -sS $SOGOU_WX_URL | grep 'account_article_'$ARTICLE_INDEX | grep -Eo '>.*?</a>'

# Fetch Sogou Video's page to get SUV and SNUID cookies
# TMP_COOKIE_FILE=/tmp/$RANDOM_STR-cookie.txt
# curl -sS --cookie-jar $TMP_COOKIE_FILE 'https://v.sogou.com/' > /dev/null
# SUV=`cat $TMP_COOKIE_FILE | grep SUV | awk '{print $7}'`
# SNUID=`cat $TMP_COOKIE_FILE | grep SNUID | awk '{print $7}'`
# rm -f $TMP_COOKIE_FILE

# TMP_REDIR_FILE=/tmp/$RANDOM_STR-redir.html
# curl -sS --cookie "SUV=$SUV" --cookie "SNUID=$SNUID" $SOGOU_LINK > $TMP_REDIR_FILE
# cat $TMP_REDIR_FILE | grep 'url +=' | grep -Eo \'.*?\' | sed 's/'\''//g' | tr -d '\n' | sed 's/http:/https:/'
# rm -f $TMP_REDIR_FILE
# echo