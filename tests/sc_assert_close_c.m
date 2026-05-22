function sc_assert_close_c(actual, expected, tol, msg)
    % SC_ASSERT_CLOSE_C Сравнение комплексных скаляров: |actual − expected| ≤ tol.
    if nargin < 3 || isempty(tol)
        tol = 1e-9;
    end
    if nargin < 4
        msg = '';
    end
    d = abs(actual - expected);
    if ~(isfinite(d))
        error('VERIFY_FAIL: %s — нечисловая разность комплексных величин', msg);
    end
    if d > tol
        error('VERIFY_FAIL: %s — ожидалось %s, получено %s (|Δ|=%.3g, допуск %.3g)', ...
            msg, mat2str(expected), mat2str(actual), d, tol);
    end
end
