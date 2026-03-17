import sys

file_path = r'd:\project-1\TGS-V11\TGS-V1\mobile\android\app\build.gradle.kts'

with open(file_path, 'rb') as f:
    content = f.read()

# Replace compileSdk
content = content.replace(b'compileSdk = flutter.compileSdkVersion', b'compileSdk = 33')
# Replace targetSdk
content = content.replace(b'targetSdk = flutter.targetSdkVersion', b'targetSdk = 33')

with open(file_path, 'wb') as f:
    f.write(content)

print("Replacement successful")
