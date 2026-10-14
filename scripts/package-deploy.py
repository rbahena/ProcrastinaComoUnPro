import os
import zipfile
import sys

def create_deploy_zip():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src_dir = os.path.join(base_dir, 'dist', 'ProcrastinaComoUnPro', 'browser')
    dest_zip = os.path.join(base_dir, 'deploy.zip')

    if not os.path.isdir(src_dir):
        print(f"Error: Source directory not found: {src_dir}")
        sys.exit(1)

    if os.path.exists(dest_zip):
        os.remove(dest_zip)

    file_count = 0
    with zipfile.ZipFile(dest_zip, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for root, dirs, files in os.walk(src_dir):
            for f in files:
                abs_path = os.path.join(root, f)
                rel_path = os.path.relpath(abs_path, src_dir).replace('\\', '/')
                zf.write(abs_path, rel_path)
                file_count += 1

    zip_size_mb = os.path.getsize(dest_zip) / (1024 * 1024)
    print(f"[OK] deploy.zip generated successfully!")
    print(f"     Total files: {file_count}")
    print(f"     Package size: {zip_size_mb:.2f} MB")
    print(f"     Format: Standard UNIX-compliant (forward slashes '/', includes hidden dotfiles like .htaccess)")

if __name__ == '__main__':
    create_deploy_zip()
