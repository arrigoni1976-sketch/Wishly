const addThousands = (str) => str.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export const formatEur = (amount) => {
  const parts = (parseFloat(amount) || 0).toFixed(2).split('.')
  return addThousands(parts[0]) + ',' + parts[1]
}

export const formatEurInt = (amount) => {
  return addThousands(String(Math.round(parseFloat(amount) || 0)))
}
