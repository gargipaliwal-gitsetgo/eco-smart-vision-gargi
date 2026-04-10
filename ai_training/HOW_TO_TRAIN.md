# How to Train Your Custom AI on Google Colab

Training AI requires a lot of computing power. If you run the Python code locally, it could crash your computer. Instead, we are going to use **Google Colab**—a free cloud computer provided by Google with super-powered GPUs.

## Step 1: Open Google Colab
1. Go to [Google Colab](https://colab.research.google.com/) and sign in with any Google account.
2. Click **New Notebook**.
3. In the menu at the top, go to **Runtime > Change runtime type**. 
4. Select **T4 GPU** (or any available GPU) and click Save. This is critical for fast training!

## Step 2: Upload Your Dataset
1. You need a dataset of waste images. You can download the famous open-source "TrashNet" dataset from Kaggle or GitHub and extract it to your computer.
2. Organize your images in folders exactly like this:
   ```text
   dataset/
     ├── plastic/     (put 100+ pictures of plastic here)
     ├── metal/       (put 100+ pictures of metal here)
     ├── wet_waste/
     └── mixed/
   ```
3. On the left side of the Google Colab screen, click the **Folder icon** 📁.
4. Drag and drop your entire `dataset` folder into this panel to upload it to the cloud computer. (This might take a minute depending on your internet speed).

## Step 3: Run the Code
1. In Colab, you write code in "cells". First, you need to install the web converter. Paste this into the first cell and click the "Play" button:
   ```python
   !pip install tensorflowjs
   ```
2. Create a new code cell clicking **+ Code**.
3. Open the `train.py` file included in this folder, copy all of the python code inside it, and paste it into that new cell.
4. Click the "Play" button to start training!

## Step 4: Export to our Website
1. You will watch the AI get smarter mathematically outputting numbers `Epoch 1/10...`.
2. When it finishes, you will see a new folder on the left side panel called `tfjs_waste_model`.
3. Right-click that folder and download it!
4. **Final Step:** Drag that downloaded folder straight into your Desktop's `waste-project` folder. Then tell me you have done this, and I will instantly edit your `index.html` to integrate it!
