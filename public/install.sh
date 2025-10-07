#!/usr/bin/env sh

auto_detect_install_type() {
    case "$(uname -s)" in
        Linux)
            # Detect default path for glibc interpreter path
            case "$(uname -m)" in
                x86_64)
                    default_interp_path="/lib64/ld-linux-x86-64.so.2"
                    ;;
                aarch64)
                    default_interp_path="/lib/ld-linux-aarch64.so.1"
                    ;;
                *)
                    echo "Could not determine GNU interpreter path for architecture $(uname -m)" >&2
                    exit 1
                    ;;
            esac

            interp_version="$("$default_interp_path" --version 2>&1 || true)"

            if [ "$(uname -o)" != "GNU/Linux" ]; then
                echo "Detected non-GNU platform, installing packed build" >&2
                echo "packed"
            elif ! echo "$interp_version" | grep -qiE 'glibc|gnu libc'; then
                echo "Detected non-GNU platform, installing packed build" >&2
                echo "packed"
            else
                echo "bin"
            fi

            ;;
        *)
            echo "bin"
    esac
}

# Wrap the installation in a function so it only runs once the
# entire script is downloaded
install_brioche() {
    set -eu

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
    install_dir="${BRIOCHE_INSTALL_DIR:-$HOME/.local/bin}"

    # The directory where to unpack the installation, when using a packed build
    unpack_dir="${BRIOCHE_INSTALL_UNPACK_DIR:-$HOME/.local/libexec/brioche}"

    # Whether to install a packed build or a standalone binary
    install_type="${BRIOCHE_INSTALL_TYPE:-auto}"

    channel="${BRIOCHE_CHANNEL:-stable}"

    # Auto-detect installation type (auto-detect for stable, packed for nightly)
    if [ "$install_type" = "auto" ]; then
        if [ "$channel" = "nightly" ]; then
            install_type="packed"
        else
            install_type="$(auto_detect_install_type)"
        fi
    fi

    # Validate installation type
    case "$install_type" in
        bin | packed)
            ;;
        *)
            echo "Unsupported installation type: $install_type" >&2
            exit 1
            ;;
    esac

    # Validate channel
    case "$channel" in
        stable | nightly)
            ;;
        *)
            echo "Unsupported channel: $channel" >&2
            exit 1
            ;;
    esac

    # Get the URL based on the kernel, architecture, installation type and channel
    case "$(uname -sm) $install_type $channel" in
        "Linux x86_64 bin stable")
            brioche_url="https://releases.brioche.dev/v0.1.5/x86_64-linux/brioche"
            checksum="0056ce9a780ea8e08138dda289f9cbef80902aa9524a8e4235e4997121b73b17"
            ;;
        "Linux x86_64 packed stable")
            brioche_url="https://releases.brioche.dev/v0.1.5/brioche-packed/x86_64-linux/brioche-packed-x86_64-linux.tar.gz"
            checksum="d80fb1a1537e90f1c189924994ca7a9325ed8e8a1d98b11d02076eb82f7c95db"
            ;;
        "Linux x86_64 packed nightly")
            brioche_url="https://development-content.brioche.dev/github.com/brioche-dev/brioche/branches/main/brioche-x86_64-linux.tar.xz"
            checksum=""
            ;;
        "Linux x86_64 bin nightly")
            brioche_url="https://development-content.brioche.dev/github.com/brioche-dev/brioche/branches/main/brioche-x86_64-linux-gnu.tar.xz"
            checksum=""
            ;;
        "Linux aarch64 packed nightly")
            brioche_url="https://development-content.brioche.dev/github.com/brioche-dev/brioche/branches/main/brioche-aarch64-linux.tar.xz"
            checksum=""
            ;;
        "Linux aarch64 bin nightly")
            brioche_url="https://development-content.brioche.dev/github.com/brioche-dev/brioche/branches/main/brioche-aarch64-linux-gnu.tar.xz"
            checksum=""
            ;;
        *)
            echo "Sorry, Brioche isn't currently supported on your platform"
            echo "  Detected kernel: $(uname -s)"
            echo "  Detected architecture: $(uname -m)"
            echo "  Installation type: $install_type"
            echo "  Channel: $channel"
            exit 1
            ;;
    esac

    # Create a temporary directory
    brioche_temp="$(mktemp -d -t brioche-XXXXXX)"
    trap 'rm -rf -- "$brioche_temp"' EXIT

    echo "Downloading Brioche..."
    echo "  URL: $brioche_url"
    echo "  Checksum: $checksum"
    echo

    # Download the file to a temporary path
    temp_download="$brioche_temp/brioche-dl.tmp"
    echo "Downloading to \`$temp_download\`..."
    curl --proto '=https' --tlsv1.2 -fL "$brioche_url" -o "$temp_download"
    echo

    if [ -n "$checksum" ]; then
        # Validate the checksum
        echo "Validating checksum..."
        echo "$checksum  $temp_download" | sha256sum -c -
        echo
    fi

    if [ "$channel" = "nightly" ]; then
        # New unified installation method

        # Unpack tarfile
        echo "Unpacking to \`$unpack_dir/nightly\`..."
        rm -rf "$unpack_dir/nightly"
        mkdir -p "$unpack_dir/nightly"
        tar -xJf "$brioche_temp/brioche-dl.tmp" --strip-components=1 -C "$unpack_dir/nightly"

        # Add a symlink to the current version
        echo "Adding symlink \`$unpack_dir/current\` -> \`nightly\`..."
        ln -sf nightly "$unpack_dir/current"

        # Add a relative symlink in the install directory to the binary
        # within the current version
        symlink_target="$unpack_dir/current/bin/brioche"
        echo "Adding symlink \`$install_dir/brioche\` -> \`$symlink_target\`..."
        mkdir -p "$install_dir"
        ln -sfr "$symlink_target" "$install_dir/brioche"
    else
        case "$install_type" in
            bin)
                # Install to the target directory
                echo "Installing to \`$install_dir/brioche\`..."
                mkdir -p "$install_dir"
                chmod +x "$temp_download"
                mv "$temp_download" "$install_dir/brioche"
                ;;
            packed)
                echo "******************************************************************************" >&2
                echo "** Heads up! Packed builds are experimental and don't support all features! **" >&2
                echo "******************************************************************************" >&2

                echo

                # Unpack tarfile into the unpack directory
                echo "Unpacking to \`$unpack_dir\`..."
                rm -rf "$unpack_dir"
                mkdir -p "$unpack_dir"
                tar -xzf "$brioche_temp/brioche-dl.tmp" --strip-components=1 -C "$unpack_dir"

                # Add a symlink in the install directory to the binary
                # within the unpacked dir
                symlink_target="$unpack_dir/bin/brioche"
                echo "Adding symlink \`$install_dir/brioche\` -> \`$symlink_target\`..."
                mkdir -p "$install_dir"
                ln -sf "$symlink_target" "$install_dir/brioche"
                ;;
            *)
                echo "Unexpected installation type: $install_type" >&2
                exit 1
                ;;
        esac
    fi

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
