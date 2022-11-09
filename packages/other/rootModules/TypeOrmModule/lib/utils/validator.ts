const isDataSourceToken = (value: any): boolean => {
	return typeof value === "string" && value.startsWith("DATASOURCE");
};

export { isDataSourceToken };
