#!/usr/bin/env sh
unset use_color safe_term match_lhs sh

alias cp="cp -i"                          # confirm before overwriting something
alias df='df -h'                          # human-readable sizes
alias free='free -m'                      # show sizes in MB
alias np='nano -w PKGBUILD'
alias more=less
alias ls="ls -hN --color=auto --group-directories-first"
alias la="ls -a -hN --color=auto --group-directories-first"
alias grep='grep --colour=auto'
alias egrep='egrep --colour=auto'
alias fgrep='fgrep --colour=auto'
xhost +local:root > /dev/null 2>&1

#set -o vi

complete -cf sudo
shopt -s checkwinsize

shopt -s expand_aliases

# export QT_SELECT=4

# Enable history appending instead of overwriting.  #139609
shopt -s histappend

# zsh-like tab-completion
bind 'set show-all-if-ambiguous on'
bind 'TAB:menu-complete'


export PS1="\[$(tput bold)\]\[$(tput setaf 2)\][\[$(tput setaf 2)\]\u\[$(tput setaf 2)\]@\[$(tput setaf 2)\]\h \[$(tput setaf 5)\]\W\[$(tput setaf 2)\]]\[$(tput setaf 5)\]\\$ \[$(tput sgr0)\]"