export const getServiceImage = (name: string = "") => {
  const lower = name.toLowerCase();
  
  if (lower.includes('lehenga') || lower.includes('saree') || lower.includes('kurta') || lower.includes('ethnic') || lower.includes('suit set')) {
    return "/images/services/lehenga.jpg"; 
  }
  
  if (lower.includes('pant') || lower.includes('trouser') || lower.includes('jeans') || lower.includes('bottom wear')) {
    return "/images/services/pant.jpg"; 
  }
  
  if (lower.includes('short') || lower.includes('half pant')) {
    return "/images/services/half_pant.jpg"; 
  }
  
  if (lower.includes('suit') || lower.includes('blazer') || lower.includes('jacket') || lower.includes('coat') || lower.includes('waist coat')) {
    return "/images/services/waist_coat.jpg"; 
  }
  
  if (lower.includes('dress') || lower.includes('gown')) {
    return "/images/services/dress.jpg"; 
  }
  
  if (lower.includes('shirt') || lower.includes('top wear') || lower.includes('t-shirt') || lower.includes('wear')) {
    return "/images/services/shirt.jpg"; 
  }
  
  if (lower.includes('blanket') || lower.includes('bed') || lower.includes('quilt')) {
    return "/images/services/blanket.jpg"; 
  }
  
  if (lower.includes('sofa') || lower.includes('curtain') || lower.includes('carpet')) {
    return "/images/services/sofa.jpg"; 
  }
  
  if (lower.includes('shoe') || lower.includes('sneaker') || lower.includes('footwear')) {
    return "/images/services/shoe.jpg"; 
  }
  
  if (lower.includes('wash') || lower.includes('laundry') || lower.includes('dry clean')) {
    return "/images/services/laundry.jpg"; 
  }
  
  // Generic beautiful premium laundry image fallback
  return "/images/services/laundry.jpg"; 
};
