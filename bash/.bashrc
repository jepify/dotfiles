#!/usr/bin/env sh
unset use_color safe_term match_lhs sh

alias cp="cp -i"                          # confirm before overwriting something
alias df='df -h'                          # human-readable sizes
alias free='free -m'                      # show sizes in MB
alias np='nano -w PKGBUILD'
alias more=less
alias ls="ls -G"
alias la="ls -a -G"
alias ll="ls -l -a -G"
alias grep='grep --colour=auto'
alias egrep='egrep --colour=auto'
alias fgrep='fgrep --colour=auto'

complete -cf sudo
shopt -s checkwinsize

shopt -s expand_aliases

# export QT_SELECT=4

# Enable history appending instead of overwriting.  #139609
shopt -s histappend

# zsh-like tab-completion
bind 'set show-all-if-ambiguous on'
bind 'TAB:menu-complete'
parse_git_branch() {
     git branch 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/(\1)/'
}

export PS1="\[$(tput bold)\]\[$(tput setaf 2)\][\[$(tput setaf 2)\]\u\[$(tput setaf 2)\]@\[$(tput setaf 2)\]\h \[$(tput setaf 5)\]\W \[\e[91m\]\$(parse_git_branch)\[\e[00m\]\[$(tput setaf 2)\]]\[$(tput setaf 5)\]\\$ \[$(tput sgr0)\]"


[ -f ~/.fzf.bash ] && source ~/.fzf.bash
