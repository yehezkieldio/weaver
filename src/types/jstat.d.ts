/**
 * Type declarations for jstat library
 *
 * jstat is a JavaScript library for statistical computations.
 * This declaration file provides types for the functions we use.
 *
 * @see https://github.com/jstat/jstat
 */

declare module "jstat" {
    /**
     * Student's t-distribution functions
     */
    const studentt: {
        /**
         * Cumulative Distribution Function for Student's t-distribution
         * @param x - The value at which to evaluate the CDF
         * @param dof - Degrees of freedom
         * @returns Probability P(T ≤ x)
         */
        cdf(x: number, dof: number): number;

        /**
         * Probability Density Function for Student's t-distribution
         * @param x - The value at which to evaluate the PDF
         * @param dof - Degrees of freedom
         * @returns Probability density at x
         */
        pdf(x: number, dof: number): number;

        /**
         * Inverse CDF (quantile function) for Student's t-distribution
         * @param p - Probability value (0-1)
         * @param dof - Degrees of freedom
         * @returns The value x such that P(T ≤ x) = p
         */
        inv(p: number, dof: number): number;
    };

    /**
     * Central F-distribution functions (Fisher-Snedecor distribution)
     */
    const centralF: {
        /**
         * Cumulative Distribution Function for F-distribution
         * @param x - The value at which to evaluate the CDF
         * @param df1 - Degrees of freedom for numerator
         * @param df2 - Degrees of freedom for denominator
         * @returns Probability P(F ≤ x)
         */
        cdf(x: number, df1: number, df2: number): number;

        /**
         * Probability Density Function for F-distribution
         * @param x - The value at which to evaluate the PDF
         * @param df1 - Degrees of freedom for numerator
         * @param df2 - Degrees of freedom for denominator
         * @returns Probability density at x
         */
        pdf(x: number, df1: number, df2: number): number;

        /**
         * Inverse CDF (quantile function) for F-distribution
         * @param p - Probability value (0-1)
         * @param df1 - Degrees of freedom for numerator
         * @param df2 - Degrees of freedom for denominator
         * @returns The value x such that P(F ≤ x) = p
         */
        inv(p: number, df1: number, df2: number): number;
    };

    /**
     * Normal (Gaussian) distribution functions
     */
    const normal: {
        /**
         * Cumulative Distribution Function for normal distribution
         * @param x - The value at which to evaluate the CDF
         * @param mean - Mean of the distribution
         * @param std - Standard deviation of the distribution
         * @returns Probability P(X ≤ x)
         */
        cdf(x: number, mean: number, std: number): number;

        /**
         * Probability Density Function for normal distribution
         * @param x - The value at which to evaluate the PDF
         * @param mean - Mean of the distribution
         * @param std - Standard deviation of the distribution
         * @returns Probability density at x
         */
        pdf(x: number, mean: number, std: number): number;

        /**
         * Inverse CDF (quantile function) for normal distribution
         * @param p - Probability value (0-1)
         * @param mean - Mean of the distribution
         * @param std - Standard deviation of the distribution
         * @returns The value x such that P(X ≤ x) = p
         */
        inv(p: number, mean: number, std: number): number;
    };

    /**
     * Chi-squared distribution functions
     */
    const chisquare: {
        /**
         * Cumulative Distribution Function for chi-squared distribution
         * @param x - The value at which to evaluate the CDF
         * @param dof - Degrees of freedom
         * @returns Probability P(χ² ≤ x)
         */
        cdf(x: number, dof: number): number;

        /**
         * Probability Density Function for chi-squared distribution
         * @param x - The value at which to evaluate the PDF
         * @param dof - Degrees of freedom
         * @returns Probability density at x
         */
        pdf(x: number, dof: number): number;

        /**
         * Inverse CDF (quantile function) for chi-squared distribution
         * @param p - Probability value (0-1)
         * @param dof - Degrees of freedom
         * @returns The value x such that P(χ² ≤ x) = p
         */
        inv(p: number, dof: number): number;
    };

    export type { studentt, centralF, normal, chisquare };
    export default { studentt, centralF, normal, chisquare };
}
