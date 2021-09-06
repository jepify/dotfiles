#!/usr/bin/env sh
unset use_color safe_term match_lhs sh

alias cp="cp -i"                          # confirm before overwriting something
alias df='df -h'                          # human-readable sizes
alias free='free -m'                      # show sizes in MB
alias np='nano -w PKGBUILD'
alias more=less
alias ls="ls -hN --color=auto --group-directories-first"
alias la="ls -A -hN --color=auto --group-directories-first"
alias ll="ls -l -a"
alias grep='rg --color=auto'

#set -o vi

complete -cf sudo
shopt -s checkwinsize

shopt -s expand_aliases

# export QT_SELECT=4

# Enable history appending instead of overwriting.  #139609
shopt -s histappend

# zsh-like tab-completion
bind 'set show-all-if-ambiguous on'
force_color_prompt=yes
color_prompt=yes

parse_git_branch() {
 git branch 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/[\1]/'
}


za() {
    zathura "$1" &>/dev/null &
}

alias radionord="mplayer -cache 1024 -cache-min 8 -bandwidth 1000000  -afm ffmpeg http://netradio.radionord.dk:8000/RadioNord"

#books
alias lpb="za ~/au/aubooks/linearprogramming.pdf"    
alias dno="za ~/au/aubooks/dno.pdf"
alias dlb="za ~/au/aubooks/deeplearningbook.pdf"
alias wot="za ~/au/aubooks/webofthings.pdf"
alias cry="za ~/au/aubooks/cryptography.pdf"
alias mpc="za ~/au/aubooks/smpcss.pdf"
alias arpp="za ~/au/aubooks/arpp.pdf"
alias icg="za ~/au/aubooks/icc.pdf"

alias rptimm="ssh jep@192.168.43.44"
alias rpcasp="ssh jep@172.20.10.13"




#export PS1="\[$(tput bold)\]\[\033[38;5;10m\][\u@\h\[$(tput sgr0)\] \[$(tput bold)\]\[\033[38;5;13m\]\W\[$(tput sgr0)\]\[\033[38;5;10m\]]\[$(tput sgr0)\] $(parse_git_branch)\[$(tput bold)\]\[\033[38;5;13m\]\\$\[$(tput sgr0)\] \[$(tput sgr0)\]"
if [ "$color_prompt" = yes ]; then
 PS1='${debian_chroot:+($debian_chroot)}\[\033[01;32m\][\u@\h\[\033[00m\] \[\033[01;95m\]\W\[\033[01;32m\]]\[\033[01;31m\]$(parse_git_branch)\[\033[95m\]\$ \[\033[0m\]'
else
 PS1='${debian_chroot:+($debian_chroot)}\u@\h:\w$(parse_git_branch)\$ '
fi
unset color_prompt force_color_prompt
#export PS1="\[$(tput bold)\]\[$(tput setaf 2)\][\[$(tput setaf 2)\]\u\[$(tput setaf 2)\]@\[$(tput setaf 2)\]\h \[$(tput setaf 5)\]\W\[$(tput setaf 2)\]]\[$(tput setaf 5)\]\\$ \[$(tput sgr0)\]"
