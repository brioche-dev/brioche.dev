#!/usr/bin/env bash

# Wrap the installation in a function so it only runs once the
# entire script is downloaded
function install_brioche() {
    set -euo pipefail

    # Validate $HOME is set to a valid directory
    if [ -z "$HOME" ]; then
        echo '$HOME environment variable is not set!'
        exit 1
    fi
    if [ ! -d "$HOME" ]; then
        echo '$HOME does not exist!'
        exit 1
    fi

    # The directory where Brioche gets installed
    install_dir="$HOME/.local/bin"

    # Get the URL based on the OS and architecture
    case "$OSTYPE" in
        linux*)
            case "$(uname -m)" in
                x86_64)
                    brioche_url="https://releases.brioche.dev/v0.1.2/x86_64-linux/brioche"
                    checksum="5a9836a7b7fbf71f3a6d2e2a32291647a6cdc7933f9d8b095fe2214ecd1d00b2"
                    ;;
                *)
                    echo "Sorry, Brioche isn't currently supported on your architecture"
                    echo "  Detected architecture: $(uname -m)"
                    exit 1
                    ;;
            esac
            ;;
        *)
            echo "Sorry, Brioche isn't currently supported on your operating system"
            echo "  Detected OS: $OSTYPE"
            exit 1
            ;;
    esac

    # Create a temporary directory
    brioche_temp="$(mktemp -d -t brioche-XXXX)"
    trap 'rm -rf -- "$brioche_temp"' EXIT

    echo "Downloading Brioche..."
    echo "  URL: $brioche_url"
    echo "  Checksum: $checksum"
    echo

    # Download to a temporary path first
    echo "Downloading to \`$brioche_temp/brioche\`..."
    curl --proto '=https' --tlsv1.2 -fL "$brioche_url" -o "$brioche_temp/brioche"
    echo

    # Validate the checksum
    echo "Validating checksum..."
    echo "$checksum  $brioche_temp/brioche" | sha256sum -c -
    echo

    # Install to the target directory
    echo "Installing to \`$install_dir/brioche\`..."
    mkdir -p "$install_dir"
    chmod +x "$brioche_temp/brioche"
    mv "$brioche_temp/brioche" "$install_dir/brioche"

    echo "Installation complete!"

    # Check if the install directory is in the $PATH
    case ":$PATH:" in
        *:$install_dir:*)
            # Already in $PATH
            ;;
        *)
            echo
            echo "\`$install_dir\` isn't in your shell \$PATH! Add it to your shell profile to finish setting up Brioche"
    esac
}

install_brioche
