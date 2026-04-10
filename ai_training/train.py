"""
Custom CNN Training Script for EcoSmart Vision

This script uses Transfer Learning (MobileNetV2 base) to train a highly accurate 
image classification model specifically on your Waste Dataset.

Instructions: 
1. Make sure your dataset is organized into folders inside a main 'dataset' folder:
   dataset/
     ├── plastic/
     ├── metal/
     ├── wet_waste/
     └── mixed/
     
2. Run this on Google Colab to utilize free GPUs!
"""

import os
# Fix for Google Colab's latest TensorFlow 2.16+ update breaking TFJS exports
os.environ["TF_USE_LEGACY_KERAS"] = "1" 

import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout

print("TensorFlow Version:", tf.__version__)

# --- HYPERPARAMETERS ---
DATASET_DIR = "dataset/"         # Ensure you upload this to Colab!
IMG_SIZE = (224, 224)            # MobileNet standard size
BATCH_SIZE = 32
EPOCHS = 10                      # Increase to 20 or 30 for max accuracy!
LEARNING_RATE = 0.001

# --- 1. LOAD THE DATASET ---
print("Loading dataset from", DATASET_DIR, "...")

train_dataset = tf.keras.preprocessing.image_dataset_from_directory(
    DATASET_DIR,
    validation_split=0.2,
    subset="training",
    seed=123,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE
)

val_dataset = tf.keras.preprocessing.image_dataset_from_directory(
    DATASET_DIR,
    validation_split=0.2,
    subset="validation",
    seed=123,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE
)

class_names = train_dataset.class_names
print("Detected Categories:", class_names)

# Optimize datasets for performance
AUTOTUNE = tf.data.AUTOTUNE
train_dataset = train_dataset.cache().shuffle(1000).prefetch(buffer_size=AUTOTUNE)
val_dataset = val_dataset.cache().prefetch(buffer_size=AUTOTUNE)

# --- 2. BUILD THE ADVANCED AI MODEL ---
# We use Transfer Learning. We take Google's massive MobileNetV2 and stick our own "Waste Classification" brain on top.

# Base Model (Pre-trained on 14 million images)
base_model = MobileNetV2(input_shape=(224, 224, 3), include_top=False, weights='imagenet')
base_model.trainable = False # Freeze it initially

# Our Custom Head
model = Sequential([
    # Data Augmentation layer to artificially create more data (rotations, flips) so the AI learns better!
    tf.keras.layers.RandomFlip("horizontal"),
    tf.keras.layers.RandomRotation(0.2),
    
    tf.keras.layers.Rescaling(1./127.5, offset=-1), # Normalize pixels to [-1, 1] requirement for MobileNetV2
    base_model,
    GlobalAveragePooling2D(),
    Dropout(0.3), # Prevent overfitting
    Dense(len(class_names), activation='softmax') # The final output neurons (One for Plastic, one for Metal, etc.)
])

# Compile the brain
model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=LEARNING_RATE),
    loss=tf.keras.losses.SparseCategoricalCrossentropy(),
    metrics=['accuracy']
)

print("Starting deep learning training...")

# --- 3. TRAIN ---
history = model.fit(
    train_dataset,
    validation_data=val_dataset,
    epochs=EPOCHS
)

# --- 4. EXPORT TO JAVASCRIPT (TFJS) FORMAT ---
print("Training Complete! Exporting to Web format...")

# Save locally as standard keras first
keras_save_path = "waste_model.h5"
model.save(keras_save_path)

# Convert to TFJS
import tensorflowjs as tfjs
tfjs_target_dir = "tfjs_waste_model"
tfjs.converters.save_keras_model(model, tfjs_target_dir)

print(f"BINGO! Successfully exported. Download the '{tfjs_target_dir}' folder and add it to your website!")
