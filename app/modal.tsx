import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Calendar, MapPin, Clock, DollarSign, Users, Target } from 'lucide-react-native';
import { useTicketStore } from '@/store/ticketStore';

export default function AddShowModal() {
  const { addShow } = useTicketStore();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    date: '',
    venue: '',
    saleTime: '',
    ticketUrl: '',
    preferences: {
      section: '',
      maxPrice: '',
      quantity: '2',
    },
  });

  const handleSave = () => {
    if (!formData.title || !formData.artist || !formData.date || !formData.venue || !formData.saleTime) {
      setShowSuccessModal(true);
      return;
    }

    addShow({
      id: Date.now().toString(),
      title: formData.title,
      artist: formData.artist,
      date: formData.date,
      venue: formData.venue,
      saleTime: formData.saleTime,
      ticketUrl: formData.ticketUrl,
      preferences: {
        section: formData.preferences.section || 'Any',
        maxPrice: parseInt(formData.preferences.maxPrice) || 500,
        quantity: parseInt(formData.preferences.quantity) || 2,
      },
      isActive: false,
    });

    router.back();
  };

  const InputField = ({ 
    icon: Icon, 
    label, 
    value, 
    onChangeText, 
    placeholder, 
    keyboardType = 'default',
    required = false 
  }: {
    icon: any;
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    keyboardType?: any;
    required?: boolean;
  }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <View style={styles.inputContainer}>
        <Icon color="#888888" size={20} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#666666"
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <X color="#FFFFFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Show</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Show Details</Text>
          
          <InputField
            icon={Target}
            label="Show Title"
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
            placeholder="e.g., Eras Tour"
            required
          />

          <InputField
            icon={Target}
            label="Artist/Event"
            value={formData.artist}
            onChangeText={(text) => setFormData({ ...formData, artist: text })}
            placeholder="e.g., Taylor Swift"
            required
          />

          <InputField
            icon={Calendar}
            label="Event Date"
            value={formData.date}
            onChangeText={(text) => setFormData({ ...formData, date: text })}
            placeholder="e.g., March 15, 2024"
            required
          />

          <InputField
            icon={MapPin}
            label="Venue"
            value={formData.venue}
            onChangeText={(text) => setFormData({ ...formData, venue: text })}
            placeholder="e.g., Madison Square Garden"
            required
          />

          <InputField
            icon={Clock}
            label="Sale Time"
            value={formData.saleTime}
            onChangeText={(text) => setFormData({ ...formData, saleTime: text })}
            placeholder="e.g., 10:00 AM EST"
            required
          />

          <InputField
            icon={Target}
            label="Ticket URL"
            value={formData.ticketUrl}
            onChangeText={(text) => setFormData({ ...formData, ticketUrl: text })}
            placeholder="https://ticketmaster.com/..."
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <InputField
            icon={Target}
            label="Preferred Section"
            value={formData.preferences.section}
            onChangeText={(text) => setFormData({ 
              ...formData, 
              preferences: { ...formData.preferences, section: text }
            })}
            placeholder="e.g., Floor, Lower Bowl, Any"
          />

          <InputField
            icon={DollarSign}
            label="Max Price per Ticket"
            value={formData.preferences.maxPrice}
            onChangeText={(text) => setFormData({ 
              ...formData, 
              preferences: { ...formData.preferences, maxPrice: text }
            })}
            placeholder="e.g., 250"
            keyboardType="numeric"
          />

          <InputField
            icon={Users}
            label="Quantity"
            value={formData.preferences.quantity}
            onChangeText={(text) => setFormData({ 
              ...formData, 
              preferences: { ...formData.preferences, quantity: text }
            })}
            placeholder="e.g., 2"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>⚠️ Important Notice</Text>
          <Text style={styles.warningText}>
            Please ensure you comply with all terms of service and local laws when using automated ticket purchasing systems.
          </Text>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <LinearGradient
            colors={['#00D4FF', '#0099CC']}
            style={styles.saveGradient}
          >
            <Text style={styles.saveButtonText}>Add Show</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
      
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Error</Text>
            <Text style={styles.modalMessage}>Please fill in all required fields</Text>
            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#CCCCCC',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B82',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  warningBox: {
    backgroundColor: 'rgba(255,107,0,0.1)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B00',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#FF6B00',
    lineHeight: 20,
  },
  saveButton: {
    marginBottom: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  spacer: {
    width: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A1B',
    borderRadius: 16,
    padding: 24,
    margin: 24,
    minWidth: 280,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#FF3B82',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});