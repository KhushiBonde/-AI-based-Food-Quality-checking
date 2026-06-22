# Smart Food Quality Checking

## Abstract

Food quality assessment plays a crucial role in ensuring consumer health and reducing food wastage. Traditional methods of food inspection rely heavily on manual examination, which is time-consuming, subjective, and prone to human error. This project presents an AI-based food quality checking system that utilizes deep learning techniques to automatically classify fruits and vegetables as fresh or rotten. The proposed system employs transfer learning using the MobileNetV2 architecture to perform image classification across 28 classes, comprising 14 fresh and 14 rotten categories of fruits and vegetables. The model achieved a validation accuracy of 96.67%, demonstrating its effectiveness in identifying food quality. Furthermore, the trained model was integrated into a Streamlit web application to provide users with an intuitive and real-time food quality assessment platform.

## 1. Introduction

Food spoilage is a major global concern that contributes significantly to economic losses and environmental issues. The early detection of spoiled food products can improve food safety standards and minimize unnecessary waste. Advances in artificial intelligence and computer vision have enabled automated inspection systems capable of identifying quality-related characteristics from images.

This project focuses on developing an image-based food quality detection system that distinguishes between fresh and rotten fruits and vegetables. By leveraging deep learning techniques and transfer learning, the proposed system provides an efficient and scalable solution for automated food quality assessment.

## 2. Literature Review

Several studies have explored the application of machine learning and deep learning techniques for food quality evaluation. Traditional machine learning approaches relied on handcrafted features such as color, texture, and shape descriptors combined with classifiers like Support Vector Machines (SVMs). However, these methods often struggled with varying environmental conditions and complex visual patterns.

Recent advancements in Convolutional Neural Networks (CNNs) have significantly improved image classification performance. Transfer learning models such as MobileNet, ResNet, and EfficientNet have been widely adopted due to their ability to leverage pre-trained knowledge from large datasets. MobileNetV2, in particular, offers a balance between computational efficiency and classification accuracy, making it suitable for real-time applications and deployment on resource-constrained platforms.

## 3. Methodology

### 3.1 Dataset Collection

The dataset consisted of images of 14 different fruits and vegetables, each categorized into fresh and rotten classes. The categories included:

* Apple
* Banana
* Bell Pepper
* Carrot
* Cucumber
* Grape
* Guava
* Jujube
* Mango
* Orange
* Pomegranate
* Potato
* Strawberry
* Tomato

This resulted in a total of 28 classification classes.

### 3.2 Data Preprocessing

The following preprocessing steps were applied:

* Resizing images to 224 × 224 pixels.
* Splitting the dataset into training and validation sets using an 80:20 ratio.
* Normalizing pixel values using a rescaling layer.
* Batch processing with a batch size of 32.

### 3.3 Model Architecture

The project utilized MobileNetV2 as the base model with ImageNet pre-trained weights. The top classification layers were replaced with custom layers consisting of:

* Global Average Pooling Layer
* Dense Layer with 128 neurons and ReLU activation
* Dropout Layer (0.3)
* Output Dense Layer with Softmax activation

The base MobileNetV2 layers were frozen during training to utilize transfer learning effectively.

## 4. Implementation

### Tools and Technologies

* Python
* TensorFlow
* MobileNetV2
* Google Colab
* Streamlit
* NumPy
* Pillow
* JSON

### Development Environment

* Model Training: Google Colab
* Version Control: GitHub
* Deployment Platform: Streamlit Community Cloud

### Workflow

1. Dataset acquisition and organization.
2. Data preprocessing and augmentation.
3. Transfer learning using MobileNetV2.
4. Model training and validation.
5. Saving the trained model and class labels.
6. Developing a Streamlit-based user interface.
7. Deployment on Streamlit Community Cloud.

## 5. Results

The trained model demonstrated strong classification performance on the validation dataset.

### Performance Metrics

* Validation Accuracy: **96.67%**
* Number of Classes: **28**
* Input Image Size: **224 × 224 pixels**
* Deep Learning Model: **MobileNetV2**

The high validation accuracy indicates that the proposed approach effectively differentiates between fresh and rotten food items across multiple categories.

## 6. Limitations

Despite achieving high accuracy, the system has several limitations:

* Performance may decrease when images are captured under poor lighting conditions.
* The model is restricted to the 14 fruit and vegetable categories used during training.
* Variations in image quality and background complexity may affect prediction accuracy.
* The current system provides classification results but does not estimate the degree of spoilage.

## 7. Future Scope

The project can be extended in several ways:

* Incorporating additional food categories to improve generalization.
* Implementing object detection for identifying multiple food items within a single image.
* Developing a mobile application for wider accessibility.
* Integrating Internet of Things (IoT) sensors for comprehensive food monitoring.
* Employing explainable AI techniques to interpret prediction outcomes.

## 8. Conclusion

This project successfully developed an AI-based food quality checking system capable of distinguishing between fresh and rotten fruits and vegetables using transfer learning. By utilizing MobileNetV2 and deploying the model through a Streamlit application, the proposed solution offers a practical and efficient approach to automated food quality assessment. The achieved validation accuracy of 96.67% demonstrates the potential of deep learning techniques in addressing real-world challenges related to food safety and waste reduction.

## 9. References

1. Sandler, M., Howard, A., Zhu, M., Zhmoginov, A., & Chen, L. (2018). *MobileNetV2: Inverted Residuals and Linear Bottlenecks*. Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition (CVPR).

2. Chollet, F. (2017). *Xception: Deep Learning with Depthwise Separable Convolutions*. Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition (CVPR).

3. TensorFlow Documentation. Available at: https://www.tensorflow.org/

4. Streamlit Documentation. Available at: https://docs.streamlit.io/

5. Kaggle Dataset Repository used for training and evaluation.
