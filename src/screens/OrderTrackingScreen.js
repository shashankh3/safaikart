import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, Platform, Animated, StyleSheet } from 'react-native';
import { useAppDimensions } from '../hooks/useAppDimensions';
import { YStack, XStack, ZStack, Text } from '../components/Stacks';




import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import Header from '../components/Header';

const timelineSteps = [
  { id: '1', title: 'Order Confirmed', time: '8:30 AM', completed: true },
  { id: '2', title: 'Picked Up (by Ravi)', time: '9:05 AM', completed: true },
  { id: '3', title: 'In Processing', desc: 'We are meticulously washing, drying, and folding your items.', time: '10:05 AM', current: true },
  { id: '4', title: 'Out for Delivery', completed: false },
  { id: '5', title: 'Delivered', completed: false },
];

const leafletHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { padding: 0; margin: 0; }
    html, body, #map { height: 100%; width: 100%; background: #F7F9F6; }
    .leaflet-control-attribution { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      center: [28.6139, 77.2090],
      zoom: 13,
      zoomControl: false,
    });
    
    // Use standard global domain but enforce Indian boundaries via region parameter
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&gl=IN', {
      maxZoom: 20
    }).addTo(map);

    var pickupIcon = L.divIcon({
      className: 'custom-icon',
      html: '<div style="background:#134C32;width:14px;height:14px;border-radius:7px;border:2px solid white;box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    
    var dropoffIcon = L.divIcon({
      className: 'custom-icon',
      html: '<div style="background:#F4C73E;width:18px;height:18px;border-radius:9px;border:2px solid white;box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    // Dummy coordinates in New Delhi
    var latlngs = [
      [28.6250, 77.2100],
      [28.5800, 77.2000]
    ];

    L.marker(latlngs[0], {icon: pickupIcon}).addTo(map);
    L.marker(latlngs[1], {icon: dropoffIcon}).addTo(map);

    var polyline = L.polyline(latlngs, {color: '#134C32', weight: 4, dashArray: '5, 5'}).addTo(map);
    map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
  </script>
</body>
</html>
`;

export default function OrderTrackingScreen() {
  const { width: windowWidth } = useAppDimensions();
  const appWidth = Math.min(windowWidth, 412);
  const insets = useSafeAreaInsets();
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const truckAnim = useRef(new Animated.Value(-50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(truckAnim, {
        toValue: appWidth - 80,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const renderTimelineItem = (step, index) => {
    const isLast = index === timelineSteps.length - 1;
    
    return (
      <XStack key={step.id} marginBottom={0}>
        <YStack width={65} paddingTop={2} alignItems="flex-end" marginRight={12}>
          <Text fontSize={11} color={step.current ? COLORS.darkGreen : COLORS.textSecondary} fontWeight={step.current ? "800" : "600"}>{step.time}</Text>
        </YStack>

        <YStack alignItems="center" width={30} marginRight={16}>
          {step.completed ? (
            <YStack width={22} height={22} borderRadius={11} backgroundColor={COLORS.darkGreen} justifyContent="center" alignItems="center">
              <Ionicons name="checkmark" size={14} color={COLORS.white} />
            </YStack>
          ) : step.current ? (
            <YStack width={30} height={30} justifyContent="center" alignItems="center">
              <Animated.View style={[{ position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: '#E6F4EA' }, { transform: [{ scale: pulseAnim }] }]} />
              <YStack width={20} height={20} borderRadius={10} backgroundColor={COLORS.vibrantYellow} justifyContent="center" alignItems="center" zIndex={10}>
                <Ionicons name="shirt" size={14} color={COLORS.darkGreen} />
              </YStack>
            </YStack>
          ) : (
            <YStack width={12} height={12} borderRadius={6} backgroundColor="#E0E0E0" marginTop={4} />
          )}
          {!isLast && <YStack width={2} flex={1} backgroundColor={step.completed ? COLORS.darkGreen : '#E0E0E0'} marginVertical={4} minHeight={30} />}
        </YStack>

        <YStack flex={1} paddingTop={0} paddingBottom={24}>
          <Text fontSize={step.current ? 15 : 14} color={step.completed ? COLORS.black : step.current ? COLORS.darkGreen : COLORS.textSecondary} fontWeight={step.completed ? "700" : step.current ? "900" : "500"} marginBottom={step.current ? 4 : 0}>
            {step.title}
          </Text>
          {step.desc && (
            <Text fontSize={12} color={COLORS.textSecondary} lineHeight={18} marginTop={4}>{step.desc}</Text>
          )}
        </YStack>
      </XStack>
    );
  };

  return (
    <YStack flex={1} backgroundColor={COLORS.primaryBg}>
      <Header />
      <ScrollView 
        contentContainerStyle={{ padding: SIZES.padding, paddingBottom: 100 + insets.bottom }} 
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
        
        {/* Map Visualization */}
        <YStack backgroundColor={COLORS.cardBg} borderRadius={SIZES.radius * 1.5} padding={SIZES.padding} marginBottom={SIZES.padding * 1.5} elevation={4} shadowColor={COLORS.cardShadow} shadowOffset={{ width: 0, height: 4 }} shadowOpacity={0.15} shadowRadius={10} borderWidth={1} borderColor="rgba(0,0,0,0.03)">
          <XStack justifyContent="space-between" alignItems="center" marginBottom={20}>
            <Text fontSize={18} fontWeight="900" color={COLORS.darkGreen} letterSpacing={0.5}>Order #SK-2401</Text>
            <YStack backgroundColor="#FEF6E0" paddingHorizontal={10} paddingVertical={4} borderRadius={12}>
              <Text fontSize={11} fontWeight="800" color="#B58600">ETA: 22 Jun, 5:00 PM</Text>
            </YStack>
          </XStack>

          <YStack 
            height={400} width="100%" backgroundColor="#F7F9F6" borderRadius={SIZES.radius} overflow="hidden" borderWidth={1} borderColor="#E8EFE9"
            onTouchStart={() => setScrollEnabled(false)}
            onTouchEnd={() => setScrollEnabled(true)}
            onTouchCancel={() => setScrollEnabled(true)}
          >
            {Platform.OS === 'web' ? (
              <iframe 
                srcDoc={leafletHtml} 
                style={{ width: '100%', height: '100%', border: 'none' }} 
              />
            ) : (
              <WebView
                originWhitelist={['*']}
                source={{ html: leafletHtml }}
                style={{ width: '100%', height: '100%' }}
                scrollEnabled={false}
                nestedScrollEnabled={true}
                bounces={false}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                mixedContentMode="always"
                injectedJavaScript={`
                  document.addEventListener('touchstart', function() { window.ReactNativeWebView.postMessage('touch_start'); }, true);
                  document.addEventListener('touchend', function() { window.ReactNativeWebView.postMessage('touch_end'); }, true);
                  document.addEventListener('touchcancel', function() { window.ReactNativeWebView.postMessage('touch_end'); }, true);
                  true;
                `}
                onMessage={(event) => {
                  const msg = event.nativeEvent.data;
                  if (msg === 'touch_start') setScrollEnabled(false);
                  else if (msg === 'touch_end') setScrollEnabled(true);
                }}
              />
            )}
          </YStack>
        </YStack>

        {/* Animated Progress Bar */}
        <YStack marginBottom={20} paddingHorizontal={10} position="relative">
          <Text fontSize={12} fontWeight="bold" color={COLORS.darkGreen} marginBottom={8} textTransform="uppercase" letterSpacing={1}>Live Tracking Active</Text>
          <YStack height={4} backgroundColor="#E0E0E0" borderRadius={2} width="100%" />
          <Animated.View style={[{ position: 'absolute', top: 10, left: 10 }, { transform: [{ translateX: truckAnim }] }]}>
            <Ionicons name="bicycle" size={28} color={COLORS.darkGreen} />
          </Animated.View>
        </YStack>

        {/* Timeline */}
        <YStack paddingHorizontal={10} marginBottom={SIZES.padding * 1.5}>
          {timelineSteps.map((step, index) => renderTimelineItem(step, index))}
        </YStack>

        {/* Receipt Styled Summary */}
        <YStack backgroundColor={COLORS.cardBg} borderRadius={SIZES.radius} padding={SIZES.padding} marginBottom={SIZES.padding} elevation={2} shadowColor="#000" shadowOffset={{ width: 0, height: 1 }} shadowOpacity={0.1} shadowRadius={4} borderWidth={1} borderColor="#EFEFEF">
          <XStack justifyContent="space-between" alignItems="center" marginBottom={16}>
            <Text fontSize={16} fontWeight="900" color={COLORS.black} letterSpacing={0.5}>Order Receipt</Text>
            <Ionicons name="receipt-outline" size={20} color={COLORS.textSecondary} />
          </XStack>
          
          <YStack height={1} borderBottomWidth={1} borderBottomColor="#E0E0E0" borderStyle="dashed" marginBottom={16} />
          
          <YStack marginBottom={4}>
            <XStack justifyContent="space-between" marginBottom={12}>
              <Text fontSize={14} color="#4A4A4A" fontWeight="500">1x Daily Laundry</Text>
              <Text fontSize={14} color={COLORS.black} fontWeight="700">₹250</Text>
            </XStack>
            <XStack justifyContent="space-between" marginBottom={12}>
              <Text fontSize={14} color="#4A4A4A" fontWeight="500">1x Footwear Revival</Text>
              <Text fontSize={14} color={COLORS.black} fontWeight="700">₹450</Text>
            </XStack>
          </YStack>

          <YStack height={1} borderBottomWidth={1} borderBottomColor="#E0E0E0" borderStyle="dashed" marginBottom={16} />
          
          <YStack paddingTop={8}>
            <XStack justifyContent="space-between" marginBottom={12}>
              <Text fontSize={18} fontWeight="900" color={COLORS.darkGreen}>Grand Total</Text>
              <Text fontSize={18} fontWeight="900" color={COLORS.darkGreen}>₹700</Text>
            </XStack>
            <Text fontSize={11} color={COLORS.textSecondary} textAlign="right" marginTop={4} fontWeight="600">Paid via UPI</Text>
          </YStack>
        </YStack>

      </ScrollView>
    </YStack>
  );
}
