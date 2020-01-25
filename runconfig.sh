#!/bin/sh

# bashrc
bashrc=~/.bashrc
if [ -f "$bashrc" ]; then
    echo "$bashrc exists. Adding link to dotfile bashrc"
    echo "[ -f \"$HOME/dotfiles/bash/.bashrc\" ] && source \"$HOME/dotfiles/bash/.bashrc\"" >> $bashrc
else
    echo "$bashrc does not exist. Adding new bashrc"
    echo "#bashrc" > $bashrc
    echo "[ -f \"$HOME/dotfiles/bash/.bashrc\" ] && source \"$HOME/dotfiles/bash/.bashrc\"" >> $bashrc
    if [ -f "$bashrc" ]; then
        echo "$bashrc created"
    else
        echo "$bashrc not created!"
    fi
fi


# create symlink for .inputrc
inrc=~/.inputrc
if [ -f "$inrc" ]; then
    echo "$inrc exists. Removing"
    rm $inrc
fi

echo "Creating .inputrc symlink"
ln -s ~/dotfiles/.inputrc $inrc

if [ -f "$inrc" ]; then
    echo "$inrc created"
else
    echo "$inrc not created!"
fi

# create symlink for vimrc
vimrc=~/.vimrc
if [ -f "$vimrc" ]; then
    echo "$vimrc exists. Removing"
    rm $vimrc
fi

echo "Creating .vimrc symlink"
ln -s ~/dotfiles/vim/.vimrc $vimrc

if [ -f "$vimrc" ]; then
    echo "$vimrc created"
else
    echo "$vimrc not created!"
fi

# create symlink for .vim dir
dotvim=~/.vim
if [ -d "$dotvim" ]; then
    echo "$dotvim exists removing"
    rm -rf $dotvim
fi

echo "Creating .vim symlink"
ln -s ~/dotfiles/vim/.vim $dotvim

if [ -d "$dotvim" ]; then
    echo "$dotvim created"
else
    echo "$dotvim not created!"
fi

echo "REMEMBER to :plugInstall in vim"

echo "Done configuring dotfiles"