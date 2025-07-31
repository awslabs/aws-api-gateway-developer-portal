# Dockerfile for development environment
# Optimized for Claude Code SSH access and IDE integration

FROM python:3.12-bookworm

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    POETRY_VERSION=2.1.3 \
    POETRY_HOME=/opt/poetry \
    POETRY_NO_INTERACTION=1

# Install system dependencies and development tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Build essentials
    build-essential \
    git \
    curl \
    ca-certificates \
    # Development tools
    vim \
    nano \
    less \
    make \
    procps \
    htop \
    jq \
    netcat-openbsd \
    sudo \
    iproute2 \
    dos2unix \
    bind9-utils \
    # Python development
    python3-dev \
    # AWS CLI dependencies
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && \
    chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && \
    apt-get install -y gh && \
    rm -rf /var/lib/apt/lists/*

# Install AWS CLI v2
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf awscliv2.zip aws/

# Install AWS SAM CLI
RUN pip install aws-sam-cli

# Install AWS Session Manager Plugin for SSO
RUN curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" -o "session-manager-plugin.deb" && \
    dpkg -i session-manager-plugin.deb && \
    rm session-manager-plugin.deb

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 - && \
    ln -s /opt/poetry/bin/poetry /usr/local/bin/poetry

# Install Node.js (required for Claude Code)
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install AWS CDK CLI
RUN npm install -g aws-cdk

# Install Claude Code globally
RUN npm install -g @anthropic-ai/claude-code

# Install Playwright with Chrome browser (required by MCP server)
RUN npx playwright install chrome --with-deps

# Set Playwright to run in headless mode by default
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0

# Build argument for flexible project directory
ARG PROJECT_DIR=current-project

# Create root's directory structure
RUN mkdir -p /root/projects/${PROJECT_DIR} && \
    mkdir -p /root/.cache/pypoetry && \
    mkdir -p /root/.ssh && \
    chmod 700 /root/.ssh

# Configure Poetry to NOT use in-project virtualenvs
RUN poetry config virtualenvs.in-project false

# Set working directory
WORKDIR /root/projects/${PROJECT_DIR}

# Switch to root and configure environment
USER root

# Set up root's bash environment with useful aliases and settings
RUN echo '# Useful aliases' >> /root/.bashrc && \
    echo 'alias ll="ls -la"' >> /root/.bashrc && \
    echo 'alias la="ls -A"' >> /root/.bashrc && \
    echo 'alias l="ls -CF"' >> /root/.bashrc && \
    echo 'alias ..="cd .."' >> /root/.bashrc && \
    echo 'alias ...="cd ../.."' >> /root/.bashrc && \
    echo 'alias gs="git status"' >> /root/.bashrc && \
    echo 'alias gd="git diff"' >> /root/.bashrc && \
    echo 'alias gl="git log --oneline -10"' >> /root/.bashrc && \
    echo 'alias dc="docker compose"' >> /root/.bashrc && \
    echo 'alias tree="find . -print | sed -e \"s;[^/]*/;|____;g;s;____|; |;g\""' >> /root/.bashrc && \
    echo '' >> /root/.bashrc && \
    echo '# Environment settings' >> /root/.bashrc && \
    echo 'export EDITOR=vim' >> /root/.bashrc && \
    echo 'export HISTSIZE=10000' >> /root/.bashrc && \
    echo 'export HISTFILESIZE=20000' >> /root/.bashrc && \
    echo 'export HISTCONTROL=ignoreboth:erasedups' >> /root/.bashrc && \
    echo '' >> /root/.bashrc && \
    echo '# Better prompt showing git branch' >> /root/.bashrc && \
    echo 'parse_git_branch() {' >> /root/.bashrc && \
    echo '    git branch 2> /dev/null | sed -e "/^[^*]/d" -e "s/* \(.*\)/ (\1)/"' >> /root/.bashrc && \
    echo '}' >> /root/.bashrc && \
    echo 'export PS1="\[\033[01;31m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[33m\]\$(parse_git_branch)\[\033[00m\]\$ "' >> /root/.bashrc && \
    echo '' >> /root/.bashrc && \
    echo '# Auto-activate Poetry virtualenv if pyproject.toml exists' >> /root/.bashrc && \
    echo 'if command -v poetry &> /dev/null && [ -f "pyproject.toml" ]; then' >> /root/.bashrc && \
    echo '    # Install dependencies if not already installed' >> /root/.bashrc && \
    echo '    if ! poetry env info --path >/dev/null 2>&1; then' >> /root/.bashrc && \
    echo '        echo "Installing project dependencies..."' >> /root/.bashrc && \
    echo '        poetry install --no-interaction --no-ansi' >> /root/.bashrc && \
    echo '    fi' >> /root/.bashrc && \
    echo '    # Activate the virtualenv' >> /root/.bashrc && \
    echo '    VENV_PATH=$(poetry env info --path 2>/dev/null)' >> /root/.bashrc && \
    echo '    if [ -n "$VENV_PATH" ] && [ -f "$VENV_PATH/bin/activate" ]; then' >> /root/.bashrc && \
    echo '        source "$VENV_PATH/bin/activate"' >> /root/.bashrc && \
    echo '        # Also add poetry bin to PATH for direct command access' >> /root/.bashrc && \
    echo '        export PATH="$VENV_PATH/bin:$PATH"' >> /root/.bashrc && \
    echo '    fi' >> /root/.bashrc && \
    echo 'fi' >> /root/.bashrc && \
    echo '' >> /root/.bashrc && \
    echo '# Useful functions' >> /root/.bashrc && \
    echo 'mkcd() { mkdir -p "$1" && cd "$1"; }' >> /root/.bashrc && \
    echo 'extract() {' >> /root/.bashrc && \
    echo '    if [ -f "$1" ]; then' >> /root/.bashrc && \
    echo '        case "$1" in' >> /root/.bashrc && \
    echo '            *.tar.bz2) tar xjf "$1" ;;' >> /root/.bashrc && \
    echo '            *.tar.gz) tar xzf "$1" ;;' >> /root/.bashrc && \
    echo '            *.tar) tar xf "$1" ;;' >> /root/.bashrc && \
    echo '            *.zip) unzip "$1" ;;' >> /root/.bashrc && \
    echo '            *) echo "Unknown archive format" ;;' >> /root/.bashrc && \
    echo '        esac' >> /root/.bashrc && \
    echo '    fi' >> /root/.bashrc && \
    echo '}' >> /root/.bashrc

# Install additional useful development tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Search and file tools
    ripgrep \
    fd-find \
    bat \
    # Network tools
    httpie \
    # JSON tools
    jo \
    # Process monitoring
    glances \
    # DNS tools
    dnsutils \
    && rm -rf /var/lib/apt/lists/* && \
    # Create symlinks for fd and bat (Debian names them differently)
    ln -s /usr/bin/fdfind /usr/local/bin/fd && \
    ln -s /usr/bin/batcat /usr/local/bin/bat

# Configure git globally as root
RUN git config --global --add safe.directory '*' && \
    git config --global color.ui auto && \
    git config --global core.editor vim && \
    git config --global credential.helper store && \
    git config --global init.defaultBranch main && \
    git config --global --unset-all http.sslbackend || true

# Configure system-wide git safe directories using build arg
ARG PROJECT_DIR=current-project
RUN echo "[safe]" >> /etc/gitconfig && \
    echo "    directory = /root/projects/${PROJECT_DIR}" >> /etc/gitconfig

# Set up vim with basic config
RUN echo 'set number' >> /root/.vimrc && \
    echo 'set autoindent' >> /root/.vimrc && \
    echo 'set expandtab' >> /root/.vimrc && \
    echo 'set tabstop=4' >> /root/.vimrc && \
    echo 'set shiftwidth=4' >> /root/.vimrc && \
    echo 'syntax on' >> /root/.vimrc

# Note: Running as root to avoid Windows/Docker permission issues
# The docker-compose.yml should NOT specify user: "1000:1000"

# Create git wrapper that forces gnutls SSL backend and prevents local config pollution
RUN echo '#!/bin/bash' > /usr/local/bin/git && \
    echo '# Prevent writing SSL backend to local repo config which would break Windows Git' >> /usr/local/bin/git && \
    echo 'if [[ "$*" == *"config"* ]] && [[ "$*" == *"sslbackend"* ]] && [[ "$*" != *"--global"* ]]; then' >> /usr/local/bin/git && \
    echo '    echo "Warning: Preventing local sslbackend config. Use --global if needed." >&2' >> /usr/local/bin/git && \
    echo '    exit 0' >> /usr/local/bin/git && \
    echo 'fi' >> /usr/local/bin/git && \
    echo 'exec /usr/bin/git -c http.sslBackend=gnutls "$@"' >> /usr/local/bin/git && \
    chmod +x /usr/local/bin/git

# Note: Project dependencies are installed on container startup via entrypoint
# This is because the project files aren't available during build time

# Add startup script to configure Git authentication
RUN echo '#!/bin/bash\n\
set -e\n\
# Copy Windows gitconfig if it exists and create Linux-compatible version\n\
if [ -f /root/.gitconfig.windows ]; then\n\
    # Copy all settings except SSL backend\n\
    grep -v "sslbackend" /root/.gitconfig.windows > /root/.gitconfig || true\n\
fi\n\
# Configure Git to use GitHub CLI for authentication if token is present\n\
if [ -n "$GH_TOKEN" ]; then\n\
    git config --global credential.https://github.com.helper "!gh auth git-credential"\n\
    git config --global credential.https://gist.github.com.helper "!gh auth git-credential"\n\
fi\n\
# Force gnutls SSL backend globally only\n\
git config --global http.sslBackend gnutls\n\
# Install project dependencies FIRST, before anything else starts\n\
# This ensures Claude Code has access to all tools\n\
if [ -f "pyproject.toml" ]; then\n\
    if ! poetry env info --path >/dev/null 2>&1; then\n\
        echo "===================================="\n\
        echo "Installing project dependencies..."\n\
        echo "===================================="\n\
        poetry install --no-interaction --no-ansi\n\
        echo "===================================="\n\
        echo "Dependencies installed successfully!"\n\
        echo "===================================="\n\
    fi\n\
    # Export the virtualenv path for child processes\n\
    VENV_PATH=$(poetry env info --path 2>/dev/null)\n\
    if [ -n "$VENV_PATH" ]; then\n\
        export PATH="$VENV_PATH/bin:$PATH"\n\
        export VIRTUAL_ENV="$VENV_PATH"\n\
    fi\n\
fi\n\
# Note: No cd command - Docker Compose working_dir handles the directory\n\
exec "$@"' > /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh


ENTRYPOINT ["/docker-entrypoint.sh"]


# Default command keeps container running
CMD ["tail", "-f", "/dev/null"]