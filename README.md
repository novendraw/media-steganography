# Media Steganography

Made by:
- Eka Novendra Wahyunadi (13517011)
- Nixon Andhika (13517059)
- Ferdy Santoso (13517116)

### Included Steganographies
- LSB and BPCS for Image (.bmp or .png)
- LSB for Audio (.wav)
- LSB for Video (.avi)

### How to Run
1. Go to root directory media-steganography/
2. Install dependencies
    ```sh
    npm install
    ```
3. Start the program
    ```sh
    npm start
    ```

### Deploy Build in bin folder
1. Install Serve
    ```sh
    npm install -g serve
    ```
2. Deploy with static server
    ```sh
    serve -s build
    ```

### How to Use
##### Embedding
1. Upload carrier media
2. Upload file to hide
3. Choose method (for image only)
4. If you want to use encryption, check the "Use Encryption" box
5. Fill in the encryption key
6. Choose hiding option (sequential or random. For random, encryption key will be used for seed)
7. Click "Hide"

##### Saving the result
1. Wait for result to be generated
2. Use browser right click "Save file as"
3. or put the filename with its extension at the field below result and click "Download Result"

##### Extracting
1. Upload stegano media
2. Choose method (for image only)
3. If you want to use decryption, check the "Use Encryption" box
4. Fill in the decryption key
5. Hiding option will be automatically determined from file so no need to choose the option
6. Click "Extract"
7. The file will be automatically downloaded with the same name as the hidden file

##### Additional Notes
- Currently, the BPCS extract algorithm does not work with uploaded stegano image. It is suspected that during the transformation of data file into image, some changes occured which cause the header data to be wrong. Currently, after embedding an image with BPCS, the extract algorithm is immediately ran on the new stegano image result.