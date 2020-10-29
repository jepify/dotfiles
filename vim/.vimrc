"## General
set number  " Show line numbers
set wrap linebreak nolist  " Break lines at word (requires Wrap lines)
set showbreak=+++   " Wrap-broken line prefix
set textwidth=0   " Line wrap (number of cols)
set showmatch   " Highlight matching brace
set spell   " Enable spell-checking

set hlsearch    " Highlight all search results
set smartcase   " Enable smart-case search
set ignorecase  " Always case-insensitive
set incsearch   " Searches for strings incrementally

set autoindent  " Auto-indent new lines
set shiftwidth=4    " Number of auto-indent spaces
set smartindent " Enable smart-indent
set smarttab    " Enable smart-tabs
set softtabstop=4   " Number of spaces per Tab
set path+=**
set wildmenu
set showcmd
set ruler   " Show row and column ruler information
set undolevels=1000 " Number of undo levels
set backspace=indent,eol,start  " Backspace behaviour
set laststatus=2
set nocompatible
if !has('gui_running')
    set t_Co=256
    set guifont=Fira\ Code\ Regular
endif

call plug#begin('~/.vim/plugged')


" Make sure you use single quotes

" Shorthand notation; fetches https://github.com/junegunn/vim-easy-align
Plug 'junegunn/vim-easy-align'

" Any valid git URL is allowed
Plug 'https://github.com/junegunn/vim-github-dashboard.git'

" Multiple Plug commands can be written in a single line using | separators
Plug 'SirVer/ultisnips' | Plug 'honza/vim-snippets'

" On-demand loading
Plug 'scrooloose/nerdtree', { 'on':  'NERDTreeToggle' }
Plug 'tpope/vim-fireplace', { 'for': 'clojure' }

" Using a non-master branch
Plug 'rdnetto/YCM-Generator', { 'branch': 'stable' }

" Using a tagged release; wildcard allowed (requires git 1.9.2 or above)
Plug 'fatih/vim-go', { 'tag': '*' }

" Plugin options
Plug 'nsf/gocode', { 'tag': 'v.20150303', 'rtp': 'vim' }

" Plugin outside ~/.vim/plugged with post-update hook
Plug 'junegunn/fzf', { 'dir': '~/.fzf', 'do': './install --all' }

" Unmanaged plugin (manually installed and updated)
Plug '~/my-prototype-plugin'


Plug 'itchyny/lightline.vim'
Plug 'itchyny/vim-gitbranch'
Plug 'itchyny/landscape.vim'
" Initialize plugin system
call plug#end()

set background=dark
syntax on
colorscheme landscape
" Lightline
let g:lightline = { 
	    \ 'colorscheme': 'landscape',
	    \ 'active': {
	    \	'left': [['mode', 'paste'],
	    \	    ['gitbranch', 'readonly', 'filename', 'modified']]
	    \ },
	    \ 'component_function': {
	    \   'gitbranch': 'gitbranch#name'
	    \ }
	    \ }


"R markdown
autocmd Filetype,BufWritePost rmd map <F5> :!echo<space>"require(rmarkdown);<space>render('<c-r>%')"<space>\|<space>R<space>--vanilla<enter>



" Remove newbie crutches in Insert Mode
inoremap <Down> <Nop>
inoremap <Left> <Nop>
inoremap <Right> <Nop>
inoremap <Up> <Nop>

" " Remove newbie crutches in Normal Mode
nnoremap <Down> <Nop>
nnoremap <Left> <Nop>
nnoremap <Right> <Nop>
nnoremap <Up> <Nop>

" " Remove newbie crutches in Visual Mode
vnoremap <Down> <Nop>
vnoremap <Left> <Nop>
vnoremap <Right> <Nop>
vnoremap <Up> <Nop>

nnoremap j gj
nnoremap k gk
