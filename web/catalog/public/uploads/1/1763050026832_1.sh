#!/bin/bash

set -e

# Define variables
PKGNAME="windsurf"
PKGDIR="/opt/${PKGNAME}"
TEMP_DIR=$(mktemp -d)
API_URL="https://windsurf-stable.codeium.com/api/update/linux-x64/stable/latest"
PRODUCT_JSON="${PKGDIR}/resources/app/product.json"
ARCH=$(uname -m)

# Function to cleanup temporary files
cleanup() {
  echo "Cleaning up temporary files..." >&2
  rm -rf "$TEMP_DIR"
}

# Set trap to ensure cleanup on script exit
trap cleanup EXIT

# Compare two version strings
# Returns 0 if version1 > version2
# Returns 1 if version1 < version2
# Returns 2 if version1 = version2
compare_versions() {
  local version1=$1
  local version2=$2

  if [[ "$version1" == "$version2" ]]; then
    return 2
  fi

  local IFS=.
  local i ver1=($version1) ver2=($version2)

  # Fill empty positions with zeros
  for ((i = ${#ver1[@]}; i < ${#ver2[@]}; i++)); do
    ver1[i]=0
  done
  for ((i = ${#ver2[@]}; i < ${#ver1[@]}; i++)); do
    ver2[i]=0
  done

  for ((i = 0; i < ${#ver1[@]}; i++)); do
    if [[ -z ${ver2[i]} ]]; then
      ver2[i]=0
    fi
    if ((10#${ver1[i]} > 10#${ver2[i]})); then
      return 0
    fi
    if ((10#${ver1[i]} < 10#${ver2[i]})); then
      return 1
    fi
  done
  return 2
}

# Get current installed version
get_current_version() {
  if [[ ! -f "$PRODUCT_JSON" ]]; then
    echo "0.0.0" # Return minimal version if not installed
    return
  fi

  local version
  version=$(grep -o '"windsurfVersion":[[:space:]]*"[^"]*"' "$PRODUCT_JSON" | cut -d'"' -f4)
  if [[ -z "$version" ]]; then
    echo "0.0.0" # Return minimal version if version not found
    return
  fi
  echo "$version"
}

# Function to fetch and parse the download URL and version
get_update_info() {
  if ! command -v curl &>/dev/null; then
    echo "Error: curl is required but not installed. Please install curl and try again." >&2
    exit 1
  fi

  echo "Checking for updates..." >&2
  local json_response
  json_response=$(curl -s "$API_URL")

  # Extract version and URL
  local version
  version=$(echo "$json_response" | grep -o '"windsurfVersion":[[:space:]]*"[^"]*"' | cut -d'"' -f4)

  if [[ -z "$version" ]]; then
    echo "Error: Failed to parse version from API response" >&2
    exit 1
  fi

  local download_url
  download_url=$(echo "$json_response" | grep -o '"url":[[:space:]]*"[^"]*"' | cut -d'"' -f4 | tr -d '[:space:]')

  if [[ -z "$download_url" ]]; then
    echo "Error: Failed to parse download URL from API response" >&2
    exit 1
  fi

  echo "$version|$download_url"
}

# Download Windsurf package
download_windsurf() {
  local download_url="$1"

  if [[ -z "$download_url" ]]; then
    echo "Error: No download URL provided" >&2
    exit 1
  fi

  echo "Downloading Windsurf package..." >&2
  echo "URL: $download_url" >&2

  if ! curl -L -f "$download_url" -o "$TEMP_DIR/windsurf.tar.gz"; then
    echo "Error: Failed to download Windsurf package" >&2
    exit 1
  fi
}

# Check for and install required dependencies
check_dependencies() {
  echo "Checking for required dependencies..." >&2

  dependencies=(
    "fontconfig"
    "gtk3"
    "python3"
    "cairo"
    "nss"
    "gcc"
    "libnotify"
    "glibc"
    "bash"
    "curl"
  )

  missing_dependencies=()

  # Check each dependency with more targeted checks
  for dep in "${dependencies[@]}"; do
    case $dep in
    "glibc")
      if ! command -v ldd &>/dev/null; then
        missing_dependencies+=("$dep")
      fi
      ;;
    "python3")
      if ! command -v python3 &>/dev/null; then
        missing_dependencies+=("$dep")
      fi
      ;;
    "gcc")
      if ! command -v gcc &>/dev/null; then
        missing_dependencies+=("$dep")
      fi
      ;;
    "bash")
      if ! command -v bash &>/dev/null; then
        missing_dependencies+=("$dep")
      fi
      ;;
    *)
      if ! ldconfig -p | grep -q "$dep"; then
        missing_dependencies+=("$dep")
      fi
      ;;
    esac
  done

  if [ ${#missing_dependencies[@]} -eq 0 ]; then
    echo "All dependencies are satisfied. You're good to go!" >&2
  else
    echo "The following dependencies are missing:" >&2
    for dep in "${missing_dependencies[@]}"; do
      echo "  - $dep" >&2
    done
    echo "Please install the missing dependencies and try again." >&2
    exit 1
  fi
}

# Extract Windsurf from downloaded tarball
install_windsurf() {
  echo "Installing Windsurf..." >&2
  sudo mkdir -p "${PKGDIR}"
  sudo mkdir -p /usr/bin /usr/share/applications /usr/share/pixmaps
  sudo tar -xz -C "${PKGDIR}" --strip-components=1 -f "$TEMP_DIR/windsurf.tar.gz"
}

# Create the Windsurf launch script
create_launch_script() {
  sudo tee /usr/bin/windsurf >/dev/null <<'EOF'
#!/bin/bash
XDG_CONFIG_HOME=${XDG_CONFIG_HOME:-~/.config}

if [[ -f $XDG_CONFIG_HOME/windsurf-flags.conf ]]; then
    readarray -t lines <"$XDG_CONFIG_HOME/windsurf-flags.conf"
    for line in "${lines[@]}"; do
        if ! [[ "$line" =~ ^[[:space:]]*# ]]; then
           CODE_USER_FLAGS+=($line)
        fi
    done
fi

exec /opt/windsurf/bin/windsurf "$@" "${CODE_USER_FLAGS[@]}"
EOF
  sudo chmod +x /usr/bin/windsurf
}

# Install the icon
install_icon() {
  sudo install -Dm644 "${PKGDIR}/resources/app/resources/linux/code.png" /usr/share/pixmaps/windsurf.png
}

# Create desktop entries
create_desktop_entries() {
  sudo tee /usr/share/applications/windsurf.desktop >/dev/null <<'EOF'
[Desktop Entry]
Name=Windsurf
Comment=The Open-Source AI-native Editor.
GenericName=Text Editor
Exec=/usr/bin/windsurf %F
Icon=windsurf
Type=Application
StartupNotify=false
StartupWMClass=Windsurf
Categories=Utility;Development;Editor;
MimeType=text/plain;inode/directory;
Actions=new-empty-window;
Keywords=vscode;windsurf;

[Desktop Action new-empty-window]
Name=New Empty Window
Exec=/usr/bin/windsurf --new-window %F
Icon=windsurf
EOF

  sudo tee /usr/share/applications/windsurf-wayland.desktop >/dev/null <<'EOF'
[Desktop Entry]
Name=Windsurf - Wayland
Comment=The Open-Source AI-native Editor.
GenericName=Text Editor
Exec=/usr/bin/windsurf --enable-features=UseOzonePlatform,WaylandWindowDecorations --ozone-platform=wayland %F
Icon=windsurf
Type=Application
StartupNotify=false
StartupWMClass=windsurf-url-handler
Categories=Utility;Development;Editor;
MimeType=text/plain;inode/directory;
Actions=new-empty-window;
Keywords=vscode;windsurf;

[Desktop Action new-empty-window]
Name=New Empty Window
Exec=/usr/bin/windsurf --enable-features=UseOzonePlatform,WaylandWindowDecorations --ozone-platform=wayland --new-window %F
Icon=windsurf
EOF

  sudo tee /usr/share/applications/windsurf-url-handler.desktop >/dev/null <<'EOF'
[Desktop Entry]
Name=Windsurf - URL Handler
Comment=The Open-Source AI-native Editor.
GenericName=Text Editor
Exec=/usr/bin/windsurf --open-url %U
Icon=windsurf
Type=Application
NoDisplay=true
StartupNotify=false
Categories=Utility;TextEditor;Development;Editor;
MimeType=x-scheme-handler/windsurf;
Keywords=vscode;windsurf;
EOF

  xdg-mime default windsurf-url-handler.desktop x-scheme-handler/windsurf
}

# Set permissions for chrome-sandbox
set_permissions() {
  sudo chown root "${PKGDIR}/chrome-sandbox"
  sudo chmod 4755 "${PKGDIR}/chrome-sandbox"
}

# Set up shell completions
setup_completions() {
  sudo mkdir -p /usr/share/zsh/site-functions /usr/share/bash-completion/completions
  sudo ln -sf "${PKGDIR}/resources/completions/zsh/_windsurf" /usr/share/zsh/site-functions/_windsurf
  sudo ln -sf "${PKGDIR}/resources/completions/bash/windsurf" /usr/share/bash-completion/completions/windsurf
}

# Main installation sequence
main() {
  echo "Starting Windsurf update check..." >&2

  # Get current and available versions
  local current_version
  current_version=$(get_current_version)

  local update_info
  update_info=$(get_update_info)
  local available_version="${update_info%%|*}"
  local download_url="${update_info#*|}"

  echo "Current version: $current_version" >&2
  echo "Available version: $available_version" >&2

  # Compare versions
  compare_versions "$available_version" "$current_version"
  local compare_result=$?

  if [[ $compare_result -eq 2 ]]; then
    echo "You are already running the latest version of Windsurf ($current_version)" >&2
    exit 0
  elif [[ $compare_result -eq 1 ]]; then
    echo "Warning: Available version ($available_version) is older than installed version ($current_version)" >&2
    echo "Skipping update to avoid downgrade" >&2
    exit 0
  fi

  echo "Update available: $current_version → $available_version" >&2

  check_dependencies
  download_windsurf "$download_url"
  install_windsurf
  create_launch_script
  install_icon
  create_desktop_entries
  set_permissions
  setup_completions
  echo "Windsurf has been successfully updated to version $available_version!" >&2
}

# Run the main function
main
