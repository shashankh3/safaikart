import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import crashlytics from '@react-native-firebase/crashlytics';
import { COLORS } from '../shared/theme/colors';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (!__DEV__) {
      crashlytics().recordError(error);
    } else {
      console.error("Uncaught error:", error, errorInfo);
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong.</Text>
          <Text style={styles.subtitle}>We've been notified and are working on it.</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryBg,
    padding: 20
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 10
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center'
  }
});
