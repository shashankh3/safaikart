import React from 'react';
import { View, Text as RNText } from 'react-native';

const mapPropsToStyle = (props) => {
  const {
    f, flex,
    bg, backgroundColor,
    jc, justifyContent,
    ai, alignItems,
    p, padding,
    px, paddingHorizontal,
    py, paddingVertical,
    pt, paddingTop,
    pb, paddingBottom,
    pl, paddingLeft,
    pr, paddingRight,
    m, margin,
    mx, marginHorizontal,
    my, marginVertical,
    mb, marginBottom,
    mt, marginTop,
    mr, marginRight,
    ml, marginLeft,
    w, width,
    h, height,
    br, borderRadius,
    fw, flexWrap,
    borderTopLeftRadius, borderTopRightRadius, borderBottomLeftRadius, borderBottomRightRadius,
    borderWidth, borderColor, borderBottomWidth, borderBottomColor,
    position, top, bottom, left, right,
    zIndex, overflow, elevation,
    shadowColor, shadowOffset, shadowOpacity, shadowRadius,
    opacity, transform, ...rest
  } = props;

  const mapToken = (val) => {
    if (val === '$1') return 4;
    if (val === '$1.5') return 6;
    if (val === '$2') return 8;
    if (val === '$3') return 12;
    if (val === '$4') return 16;
    if (val === '$5') return 20;
    return val;
  };

  const style = {
    flex: f !== undefined ? f : flex,
    backgroundColor: bg !== undefined ? bg : backgroundColor,
    justifyContent: jc !== undefined ? jc : justifyContent,
    alignItems: ai !== undefined ? ai : alignItems,
    padding: p !== undefined ? mapToken(p) : padding,
    paddingHorizontal: px !== undefined ? mapToken(px) : paddingHorizontal,
    paddingVertical: py !== undefined ? mapToken(py) : paddingVertical,
    paddingTop: pt !== undefined ? mapToken(pt) : paddingTop,
    paddingBottom: pb !== undefined ? mapToken(pb) : paddingBottom,
    paddingLeft: pl !== undefined ? mapToken(pl) : paddingLeft,
    paddingRight: pr !== undefined ? mapToken(pr) : paddingRight,
    margin: m !== undefined ? mapToken(m) : margin,
    marginHorizontal: mx !== undefined ? mapToken(mx) : marginHorizontal,
    marginVertical: my !== undefined ? mapToken(my) : marginVertical,
    marginBottom: mb !== undefined ? mapToken(mb) : marginBottom,
    marginTop: mt !== undefined ? mapToken(mt) : marginTop,
    marginRight: mr !== undefined ? mapToken(mr) : marginRight,
    marginLeft: ml !== undefined ? mapToken(ml) : marginLeft,
    width: w !== undefined ? w : width,
    height: h !== undefined ? h : height,
    borderRadius: br !== undefined ? mapToken(br) : borderRadius,
    flexWrap: fw !== undefined ? fw : flexWrap,
    borderTopLeftRadius, borderTopRightRadius, borderBottomLeftRadius, borderBottomRightRadius,
    borderWidth, borderColor, borderBottomWidth, borderBottomColor,
    position, top, bottom, left, right,
    zIndex, overflow, elevation,
    shadowColor, shadowOffset, shadowOpacity, shadowRadius,
    opacity, transform
  };

  Object.keys(style).forEach(key => style[key] === undefined && delete style[key]);

  return { style, rest };
};

export const YStack = ({ children, style: customStyle, onLayout, ...props }: any) => {
  const { style, rest } = mapPropsToStyle(props);
  return (
    <View style={[{ flexDirection: 'column' }, style, customStyle]} onLayout={onLayout} {...rest}>
      {children}
    </View>
  );
};

export const XStack = ({ children, style: customStyle, onLayout, ...props }: any) => {
  const { style, rest } = mapPropsToStyle(props);
  return (
    <View style={[{ flexDirection: 'row' }, style, customStyle]} onLayout={onLayout} {...rest}>
      {children}
    </View>
  );
};

export const ZStack = ({ children, style: customStyle, onLayout, ...props }: any) => {
  const { style, rest } = mapPropsToStyle(props);
  return (
    <View style={[style, customStyle]} onLayout={onLayout} {...rest}>
      {React.Children.map(children, child => 
        React.isValidElement<any>(child) 
          ? React.cloneElement(child, { style: [child.props.style, { position: 'absolute' }] }) 
          : child
      )}
    </View>
  );
};

export const Text = ({ fontSize, fontWeight, color, fontFamily, letterSpacing, marginBottom, marginTop, marginRight, marginLeft, marginVertical, marginHorizontal, textAlign, textDecorationLine, lineHeight, opacity, flex, textTransform, alignSelf, padding, paddingHorizontal, paddingVertical, textShadowColor, textShadowOffset, textShadowRadius, style, children, numberOfLines, ellipsizeMode, ...props }: any) => (
  <RNText 
    numberOfLines={numberOfLines}
    ellipsizeMode={ellipsizeMode}
    style={[{ fontSize, fontWeight, color, fontFamily, letterSpacing, marginBottom, marginTop, marginRight, marginLeft, marginVertical, marginHorizontal, textAlign, textDecorationLine, lineHeight, opacity, flex, textTransform, alignSelf, padding, paddingHorizontal, paddingVertical, textShadowColor, textShadowOffset, textShadowRadius }, style]} 
    {...props}
  >
    {children}
  </RNText>
);
